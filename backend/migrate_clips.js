const { poolConnect, pool } = require('./config/db');

async function createClipsTables() {
    try {
        await poolConnect;
        console.log('Conectado a SQL Server. Creando tablas...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='clips' AND xtype='U')
            BEGIN
                CREATE TABLE clips (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
                    game_name VARCHAR(255) NOT NULL,
                    video_url VARCHAR(500) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    views INT DEFAULT 0,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Tabla clips creada';
            END
            ELSE PRINT 'Tabla clips ya existe';
        `);

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='clip_likes' AND xtype='U')
            BEGIN
                CREATE TABLE clip_likes (
                    clip_id INT NOT NULL FOREIGN KEY REFERENCES clips(id) ON DELETE CASCADE,
                    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
                    created_at DATETIME DEFAULT GETDATE(),
                    PRIMARY KEY (clip_id, user_id)
                );
                PRINT 'Tabla clip_likes creada';
            END
            ELSE PRINT 'Tabla clip_likes ya existe';
        `);

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='clip_comments' AND xtype='U')
            BEGIN
                CREATE TABLE clip_comments (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    clip_id INT NOT NULL FOREIGN KEY REFERENCES clips(id) ON DELETE CASCADE,
                    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
                    content NVARCHAR(1000) NOT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Tabla clip_comments creada';
            END
            ELSE PRINT 'Tabla clip_comments ya existe';
        `);

        console.log('Todas las tablas de clips creadas con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('Error creando tablas:', err);
        process.exit(1);
    }
}

createClipsTables();
