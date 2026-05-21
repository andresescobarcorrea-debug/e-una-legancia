// migrate_notifications.js
// Ejecutar con node migrate_notifications.js para crear la tabla notifications en SQL Server
const { pool, poolConnect } = require('./config/db');

(async () => {
    try {
        console.log('Iniciando migración de Notificaciones...');
        await poolConnect;
        const request = pool.request();
        await request.query(`
            IF OBJECT_ID('notifications', 'U') IS NULL
            BEGIN
                CREATE TABLE notifications (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    sender_id INT NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    reference_id VARCHAR(50) NULL,
                    is_read BIT DEFAULT 0,
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_Notifications_User FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT FK_Notifications_Sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE NO ACTION
                );
                PRINT 'Tabla notifications creada exitosamente';
            END
            ELSE
            BEGIN
                PRINT 'La tabla notifications ya existe';
            END
        `);
        console.log('✅ Migración de notificaciones finalizada correctamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creando tabla notifications', err);
        process.exit(1);
    }
})();
