const { poolConnect, pool } = require('./config/db');

async function migrateRankings() {
    try {
        await poolConnect;
        console.log('✅ Conectado a SQL Server');

        // Crear tabla ranking_items
        await pool.request().query(`
            IF OBJECT_ID('ranking_items', 'U') IS NULL
            BEGIN
                CREATE TABLE ranking_items (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    title VARCHAR(255) NOT NULL,
                    category VARCHAR(50) NOT NULL, -- 'juegos', 'personajes'
                    image VARCHAR(500) NOT NULL,
                    points INT NOT NULL DEFAULT 0,
                    votes_count INT NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Tabla ranking_items creada.';
            END
            ELSE
            BEGIN
                PRINT 'La tabla ranking_items ya existe.';
            END
        `);

        // Crear tabla ranking_votes
        await pool.request().query(`
            IF OBJECT_ID('ranking_votes', 'U') IS NULL
            BEGIN
                CREATE TABLE ranking_votes (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
                    item_id INT NOT NULL FOREIGN KEY REFERENCES ranking_items(id) ON DELETE CASCADE,
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT UQ_RankingVote UNIQUE (user_id, item_id)
                );
                PRINT 'Tabla ranking_votes creada.';
            END
            ELSE
            BEGIN
                PRINT 'La tabla ranking_votes ya existe.';
            END
        `);

        // Insertar datos iniciales si la tabla está vacía
        const checkItems = await pool.request().query('SELECT COUNT(*) as count FROM ranking_items');
        if (checkItems.recordset[0].count === 0) {
            await pool.request().query(`
                INSERT INTO ranking_items (title, category, image, points, votes_count) VALUES 
                ('Black Myth: Wukong', 'juegos', 'https://cdn.mos.cms.futurecdn.net/PBzjSZy5sxMfbEFpskecSD.jpg', 0, 0),
                ('GTA VI', 'juegos', 'https://media.vandal.net/m/2-2026/23/20262239295557_1.jpg', 0, 0),
                ('Kratos', 'personajes', 'https://i.blogs.es/08d770/por-que-kratos-es-inmortal/1366_2000.png', 0, 0),
                ('Elden Ring: Nightreign', 'juegos', 'https://store-images.s-microsoft.com/image/apps.34436.14220340964291907.89c95a82-805b-43b9-8393-3be8df29bd15.02e8faf2-3502-4e18-aa20-ba1bdf43716f?q=90&w=480&h=270', 0, 0),
                ('Aloy (Horizon)', 'personajes', 'https://i0.wp.com/codigoespagueti.com/wp-content/uploads/2021/05/horizon-forbidden-west-aloy-fea.jpg', 0, 0);
            `);
            console.log('Datos iniciales insertados en ranking_items.');
        } else {
            // Si ya hay datos, reiniciar los contadores a 0 como se pidió
            await pool.request().query(`
                UPDATE ranking_items SET points = 0, votes_count = 0;
                DELETE FROM ranking_votes;
            `);
            console.log('Contadores de ranking reiniciados a 0.');
        }

        console.log('Migración de Rankings completada exitosamente.');
        process.exit(0);

    } catch (err) {
        console.error('Error en migración:', err);
        process.exit(1);
    }
}

migrateRankings();
