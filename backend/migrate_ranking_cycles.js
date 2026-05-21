const { poolConnect, pool } = require('./config/db');

async function migrateRankingCycles() {
    try {
        await poolConnect;
        console.log('✅ Conectado a SQL Server');

        // Crear tabla ranking_cycles
        await pool.request().query(`
            IF OBJECT_ID('ranking_cycles', 'U') IS NULL
            BEGIN
                CREATE TABLE ranking_cycles (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    started_at DATETIME DEFAULT GETDATE(),
                    ends_at DATETIME NOT NULL
                );
                PRINT 'Tabla ranking_cycles creada.';
                
                -- Insertar ciclo inicial si no existe
                INSERT INTO ranking_cycles (started_at, ends_at) 
                VALUES (GETDATE(), DATEADD(day, 3, GETDATE()));
                PRINT 'Ciclo inicial insertado.';
            END
            ELSE
            BEGIN
                PRINT 'La tabla ranking_cycles ya existe.';
            END
        `);

        console.log('Migración de Ranking Cycles completada exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('Error en migración:', err);
        process.exit(1);
    }
}

migrateRankingCycles();
