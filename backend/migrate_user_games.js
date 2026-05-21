// migrate_user_games.js
// Ejecutar con node migrate_user_games.js para crear la tabla user_games en SQL Server
// Requiere la configuración existente en backend/config/db.js

const { pool, poolConnect } = require('./config/db');

(async () => {
    try {
        await poolConnect;
        const request = pool.request();
        await request.query(`
            IF OBJECT_ID('user_games', 'U') IS NULL
            BEGIN
                CREATE TABLE user_games (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    game_id VARCHAR(50) NOT NULL,
                    game_name VARCHAR(255) NOT NULL,
                    game_image VARCHAR(500) NULL,
                    rating FLOAT NULL,
                    released DATE NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_UserGames_User FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT UQ_UserGame UNIQUE (user_id, game_id)
                );
            END;
        `);
        console.log('Tabla user_games creada o ya existía');
        process.exit(0);
    } catch (err) {
        console.error('Error creando tabla user_games', err);
        process.exit(1);
    }
})();
