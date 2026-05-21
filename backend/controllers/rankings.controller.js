const { pool } = require('../config/db');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const FALLBACK_GAMES = [
    { name: "The Witcher 3: Wild Hunt", image: "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg" },
    { name: "Grand Theft Auto V", image: "https://media.rawg.io/media/games/456/456fc5a11f81d78612148a9c28979d1e.jpg" },
    { name: "Portal 2", image: "https://media.rawg.io/media/games/328/328361590d7b409edeb173cc3110547f.jpg" },
    { name: "Counter-Strike: Global Offensive", image: "https://media.rawg.io/media/games/736/736194a1d1e4e38608f5b8edd1690640.jpg" },
    { name: "Tomb Raider (2013)", image: "https://media.rawg.io/media/games/021/02184bae5104ced0f2ea63db90a48f02.jpg" },
    { name: "The Elder Scrolls V: Skyrim", image: "https://media.rawg.io/media/games/7a2/7a211ae2e670d1ec2629c0a850d8d4c6.jpg" },
    { name: "Red Dead Redemption 2", image: "https://media.rawg.io/media/games/511/511a4307d0055e2672c3fc31b1499d27.jpg" },
    { name: "Left 4 Dead 2", image: "https://media.rawg.io/media/games/198/198157c7738987974e81b5c4c3cfc297.jpg" },
    { name: "BioShock Infinite", image: "https://media.rawg.io/media/games/fc1/fc150dc6dca947fd63f27134b91a0240.jpg" }
];

async function generateNewCycle() {
    try {
        console.log('Generating new 3-day ranking cycle with exactly 9 unique games from RAWG...');
        
        let selectedGames = [];
        
        try {
            const page = Math.floor(Math.random() * 20) + 1; // Random page 1-20
            const rawgUrl = `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page=${page}&page_size=20&ordering=-added`;
            const response = await axios.get(rawgUrl);
            let games = response.data.results || [];
            
            // Filter games with valid name and image
            games = games.filter(g => g.name && g.background_image);
            
            // Shuffle
            games.sort(() => 0.5 - Math.random());
            
            if (games.length >= 9) {
                selectedGames = games.slice(0, 9).map(g => ({
                    name: g.name,
                    image: g.background_image
                }));
            } else {
                throw new Error('Not enough games returned from RAWG API');
            }
        } catch (apiError) {
            console.warn('RAWG API failed, loading elegant fallback games:', apiError.message);
            selectedGames = [...FALLBACK_GAMES].sort(() => 0.5 - Math.random());
        }

        // Begin transaction to refresh cycle, items, and votes in a single transaction query
        let sqlQuery = `
            BEGIN TRANSACTION;
            DELETE FROM ranking_votes;
            DELETE FROM ranking_items;
            INSERT INTO ranking_cycles (started_at, ends_at) 
            VALUES (GETDATE(), DATEADD(day, 3, GETDATE()));
        `;
        
        // Insert 9 items (5 under category 'juegos', 4 under category 'personajes')
        for (let i = 0; i < selectedGames.length; i++) {
            const game = selectedGames[i];
            const title = game.name.replace(/'/g, "''");
            const image = game.image;
            const category = i < 5 ? 'juegos' : 'personajes';
            
            sqlQuery += `
                INSERT INTO ranking_items (title, category, image, points, votes_count)
                VALUES ('${title}', '${category}', '${image}', 0, 0);
            `;
        }
        
        sqlQuery += `
            COMMIT TRANSACTION;
        `;
        
        const request = pool.request();
        await request.query(sqlQuery);
        console.log('Successfully completed ranking generation.');
    } catch (err) {
        console.error('Fatal error generating new cycle:', err);
    }
}

exports.getItems = async (req, res) => {
    try {
        // Verificar el ciclo actual
        const cycleResult = await pool.request().query(`
            SELECT TOP 1 id, ends_at FROM ranking_cycles ORDER BY id DESC
        `);
        
        let cycleEndsAt = null;
        
        if (cycleResult.recordset.length === 0) {
            // No existe ciclo, generar el primero
            await generateNewCycle();
            const newCycle = await pool.request().query(`SELECT TOP 1 ends_at FROM ranking_cycles ORDER BY id DESC`);
            cycleEndsAt = newCycle.recordset[0].ends_at;
        } else {
            const currentCycle = cycleResult.recordset[0];
            const now = new Date();
            const endsAt = new Date(currentCycle.ends_at);
            
            if (now > endsAt) {
                // El ciclo expiró, generar uno nuevo
                await generateNewCycle();
                const newCycle = await pool.request().query(`SELECT TOP 1 ends_at FROM ranking_cycles ORDER BY id DESC`);
                cycleEndsAt = newCycle.recordset[0].ends_at;
            } else {
                cycleEndsAt = currentCycle.ends_at;
            }
        }

        // Obtener ítems
        const result = await pool.request().query(`
            SELECT id, title, category, image, points, votes_count
            FROM ranking_items
            ORDER BY points DESC
        `);

        // Comprobar si el usuario actual ya ha votado en este ciclo
        let hasVoted = false;
        let votedItemId = null;
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const secret = process.env.JWT_SECRET || 'regaming_secret';
                const decoded = jwt.verify(token, secret);
                const userId = decoded.userId;

                const checkVote = await pool.request()
                    .input('user_id', userId)
                    .query('SELECT item_id FROM ranking_votes WHERE user_id = @user_id');
                
                if (checkVote.recordset.length > 0) {
                    hasVoted = true;
                    votedItemId = checkVote.recordset[0].item_id;
                }
            }
        } catch (authError) {
            // Ignorar errores de verificación de token para mantener la ruta pública
        }
        
        res.json({ 
            success: true, 
            items: result.recordset,
            cycleEndsAt: cycleEndsAt,
            hasVoted: hasVoted,
            votedItemId: votedItemId
        });
    } catch (error) {
        console.error('Error fetching ranking items:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

exports.voteItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = parseInt(req.params.id);

        if (!itemId) {
            return res.status(400).json({ success: false, error: 'ID de ítem inválido.' });
        }

        // Comprobar si ya votó por CUALQUIER elemento en este ciclo
        const checkVote = await pool.request()
            .input('user_id', userId)
            .query('SELECT 1 FROM ranking_votes WHERE user_id = @user_id');

        if (checkVote.recordset.length > 0) {
            return res.status(400).json({ success: false, error: 'Ya has votado en este ciclo. Solo se permite un voto total por ciclo.' });
        }

        // Ejecutar inserción de voto y actualización de puntos
        const request = pool.request();
        request.input('user_id', userId);
        request.input('item_id', itemId);
        
        await request.query(`
            BEGIN TRANSACTION;
            
            INSERT INTO ranking_votes (user_id, item_id) VALUES (@user_id, @item_id);
            
            UPDATE ranking_items 
            SET points = points + 10, votes_count = votes_count + 1 
            WHERE id = @item_id;
            
            COMMIT TRANSACTION;
        `);

        res.json({ success: true, message: 'Voto registrado. +10 puntos.' });

    } catch (error) {
        console.error('Error voting item:', error);
        if (error.message && error.message.includes('UQ_RankingVote')) {
            return res.status(400).json({ success: false, error: 'Ya has votado por este elemento.' });
        }
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
