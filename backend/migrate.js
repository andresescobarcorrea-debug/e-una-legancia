const { poolConnect, pool } = require('./config/db');

async function alterTable() {
    try {
        await poolConnect;
        await pool.request().query(`
            IF COL_LENGTH('users', 'profile_image') IS NULL
            BEGIN
                ALTER TABLE users ADD profile_image VARCHAR(500);
                PRINT 'Columna profile_image agregada exitosamente';
            END
            ELSE
            BEGIN
                PRINT 'La columna profile_image ya existe';
            END
        `);
        console.log('Script SQL finalizado');
        process.exit(0);
    } catch (err) {
        console.error('Error alterando tabla:', err);
        process.exit(1);
    }
}

alterTable();
