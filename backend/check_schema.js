const { poolConnect, pool } = require('./config/db');

async function checkSchema() {
    try {
        await poolConnect;
        const res = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'user_preferences'
        `);
        console.log('Columns in user_preferences:', res.recordset.map(r => r.COLUMN_NAME));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkSchema();
