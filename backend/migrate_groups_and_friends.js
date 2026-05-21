const { poolConnect, pool } = require('./config/db');

async function migrate() {
    try {
        console.log('Iniciando migración de Amigos y Grupos...');
        await poolConnect;

        // 1. Crear tabla de amigos
        await pool.request().query(`
            IF OBJECT_ID('friends', 'U') IS NULL
            BEGIN
                CREATE TABLE friends (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
                    friend_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
                    status VARCHAR(50) DEFAULT 'accepted',
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT UQ_Friendship UNIQUE (user_id, friend_id)
                );
                PRINT 'Tabla friends creada exitosamente';
            END
            ELSE
            BEGIN
                PRINT 'La tabla friends ya existe';
            END
        `);

        // 2. Crear tabla de participantes de grupos (debates privados)
        await pool.request().query(`
            IF OBJECT_ID('group_participants', 'U') IS NULL
            BEGIN
                CREATE TABLE group_participants (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    debate_id INT NOT NULL FOREIGN KEY REFERENCES debates(id) ON DELETE CASCADE,
                    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
                    joined_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT UQ_Group_Participant UNIQUE (debate_id, user_id)
                );
                PRINT 'Tabla group_participants creada exitosamente';
            END
            ELSE
            BEGIN
                PRINT 'La tabla group_participants ya existe';
            END
        `);

        // 3. Sembrar usuarios gamer semilla y establecer amistad automática bidireccional
        await pool.request().query(`
            -- Insertar usuarios gamer semilla
            IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'GamerPro_99')
                INSERT INTO users (username, email, password_hash, role_id, score) VALUES ('GamerPro_99', 'gamerpro99@regaming.com', '$2b$10$3yUu4c6v2U0Z/n7kP4F2Uu51iA9o5/Z9y61Wk9.zF6tG8n8c/pA6a', 1, 150);
            IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'CyberPanda')
                INSERT INTO users (username, email, password_hash, role_id, score) VALUES ('CyberPanda', 'cyberpanda@regaming.com', '$2b$10$3yUu4c6v2U0Z/n7kP4F2Uu51iA9o5/Z9y61Wk9.zF6tG8n8c/pA6a', 1, 230);
            IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'LaraCraft')
                INSERT INTO users (username, email, password_hash, role_id, score) VALUES ('LaraCraft', 'laracraft@regaming.com', '$2b$10$3yUu4c6v2U0Z/n7kP4F2Uu51iA9o5/Z9y61Wk9.zF6tG8n8c/pA6a', 1, 310);
            IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'MasterChief')
                INSERT INTO users (username, email, password_hash, role_id, score) VALUES ('MasterChief', 'masterchief@regaming.com', '$2b$10$3yUu4c6v2U0Z/n7kP4F2Uu51iA9o5/Z9y61Wk9.zF6tG8n8c/pA6a', 1, 420);
            IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'Slayer_x')
                INSERT INTO users (username, email, password_hash, role_id, score) VALUES ('Slayer_x', 'slayerx@regaming.com', '$2b$10$3yUu4c6v2U0Z/n7kP4F2Uu51iA9o5/Z9y61Wk9.zF6tG8n8c/pA6a', 1, 180);

            -- Relacionar amistad bidireccional
            DECLARE @GamerId INT, @UserId INT;
            
            DECLARE user_cursor CURSOR FOR 
            SELECT id FROM users;
            
            OPEN user_cursor;
            FETCH NEXT FROM user_cursor INTO @UserId;
            
            WHILE @@FETCH_STATUS = 0
            BEGIN
                DECLARE seed_cursor CURSOR FOR
                SELECT id FROM users WHERE username IN ('GamerPro_99', 'CyberPanda', 'LaraCraft', 'MasterChief', 'Slayer_x');
                
                OPEN seed_cursor;
                FETCH NEXT FROM seed_cursor INTO @GamerId;
                
                WHILE @@FETCH_STATUS = 0
                BEGIN
                    IF @UserId <> @GamerId
                    BEGIN
                        -- Amistad 1 -> 2
                        IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = @UserId AND friend_id = @GamerId)
                            INSERT INTO friends (user_id, friend_id, status) VALUES (@UserId, @GamerId, 'accepted');
                        
                        -- Amistad 2 -> 1
                        IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = @GamerId AND friend_id = @UserId)
                            INSERT INTO friends (user_id, friend_id, status) VALUES (@GamerId, @UserId, 'accepted');
                    END
                    FETCH NEXT FROM seed_cursor INTO @GamerId;
                END
                CLOSE seed_cursor;
                DEALLOCATE seed_cursor;
                
                FETCH NEXT FROM user_cursor INTO @UserId;
            END
            CLOSE user_cursor;
            DEALLOCATE user_cursor;
            
            PRINT 'Amistades bidireccionales sembradas exitosamente';
        `);

        console.log('✅ Migración y sembrado finalizado correctamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error ejecutando la migración:', err);
        process.exit(1);
    }
}

migrate();
