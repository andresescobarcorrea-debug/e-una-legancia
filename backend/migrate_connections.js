const { poolConnect, pool } = require('./config/db');

async function createConnectionsTable() {
    try {
        await poolConnect;
        await pool.request().query(`
            IF OBJECT_ID('user_connections', 'U') IS NULL
            BEGIN
                CREATE TABLE user_connections (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
                    platform VARCHAR(50) NOT NULL,
                    platform_account_id VARCHAR(255) NOT NULL,
                    platform_username VARCHAR(255),
                    platform_email VARCHAR(255),
                    platform_avatar_url VARCHAR(500),
                    access_token TEXT,
                    refresh_token TEXT,
                    token_expires_at DATETIME,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT UQ_User_Platform UNIQUE (user_id, platform)
                );
                PRINT 'Tabla user_connections creada exitosamente';
            END
            ELSE
            BEGIN
                PRINT 'La tabla user_connections ya existe';
            END
        `);
        console.log('Migración de connections finalizada correctamente.');
        process.exit(0);
    } catch (err) {
        console.error('Error creando la tabla:', err);
        process.exit(1);
    }
}

createConnectionsTable();
