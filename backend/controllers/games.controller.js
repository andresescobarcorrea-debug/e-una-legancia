const axios = require('axios');

const getUpcoming = (req, res, next) => {
    try {
        const upcomingReleases = [
            { title: "Silksong", platform: "PC, Switch, Xbox", date: "2026-12-01T00:00:00" },
            { title: "GTA VI", platform: "PS5, Xbox Series", date: "2026-10-15T00:00:00" },
            { title: "Metroid Prime 4", platform: "Switch", date: "2026-11-20T00:00:00" },
            { title: "The Witcher 4", platform: "PC, PS5", date: "2027-03-01T00:00:00" }
        ];
        res.json({ success: true, games: upcomingReleases });
    } catch (error) {
        next(error);
    }
};

const getOffers = async (req, res, next) => {
    try {
        const response = await axios.get('https://www.cheapshark.com/api/1.0/deals?upperPrice=60');
        res.json({ success: true, deals: response.data });
    } catch (error) {
        next(error);
    }
};

const getGames = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const sort = req.query.sort || 'popular';
        
        let ordering = '-added'; // popular por defecto
        if (sort === 'released_desc') ordering = '-released';
        else if (sort === 'released_asc') ordering = 'released';
        else if (sort === 'rating') ordering = '-rating';
        else if (sort === 'name') ordering = 'name';

        const response = await axios.get(`https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&page=${page}&page_size=${pageSize}&ordering=${ordering}`);
        res.json({ success: true, games: response.data.results, nextPage: page + 1, hasMore: response.data.next !== null });
    } catch (error) {
        // Fallback similar a la página principal
        console.error('Error fetching games page', error.message);
        const fallbackGames = [];
        res.status(500).json({ success: false, message: 'Error obteniendo juegos', fallbackGames });
    }
};

const searchGames = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const response = await axios.get(`https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=20`);
        res.json({ success: true, games: response.data.results });
    } catch (error) {
        console.error('Error searching games', error.message);
        res.status(500).json({ success: false, message: 'Error en búsqueda de juegos' });
    }
};

const getGameById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const detailsRes = await axios.get(`https://api.rawg.io/api/games/${id}?key=${process.env.RAWG_API_KEY}`);
        let screenshots = [];
        let trailers = [];
        try {
            const ssRes = await axios.get(`https://api.rawg.io/api/games/${id}/screenshots?key=${process.env.RAWG_API_KEY}`);
            screenshots = ssRes.data.results || [];
        } catch (e) {
            console.error('No screenshots found for game', id);
        }
        try {
            const trailerRes = await axios.get(`https://api.rawg.io/api/games/${id}/movies?key=${process.env.RAWG_API_KEY}`);
            trailers = trailerRes.data.results || [];
        } catch (e) {
            console.error('No trailers found for game', id);
        }
        res.json({
            success: true,
            game: detailsRes.data,
            screenshots,
            trailers
        });
    } catch (error) {
        console.error('Error fetching game by id', error.message);
        res.status(500).json({ success: false, message: 'Error obteniendo detalles del juego' });
    }
};

const getPopularGames = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const response = await axios.get(
            `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}` +
            `&page=${page}&page_size=${pageSize}&ordering=-added`
        );
        // Return plain array for frontend simplicity
        res.json(response.data.results);
    } catch (error) {
        console.error('Error fetching popular games', error.message);
        res.status(500).json([]);
    }
};

const getUpcomingGames = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const response = await axios.get(
            `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}` +
            `&page=${page}&page_size=${pageSize}&dates=${new Date().toISOString().split('T')[0]},2025-12-31&ordering=-added`
        );
        res.json({ success: true, games: response.data.results, hasMore: response.data.next !== null });
    } catch (error) {
        console.error('Error fetching upcoming games', error.message);
        res.status(500).json({ success: false, games: [] });
    }
};

module.exports = {
    getUpcoming,
    getOffers,
    getGames,
    searchGames,
    getGameById,
    getPopularGames,
    getUpcomingGames
};
