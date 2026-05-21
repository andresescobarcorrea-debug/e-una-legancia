const { pool, poolConnect, sql } = require('../config/db');

// Obtener todas las notificaciones del usuario actual
const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await poolConnect;

        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT n.id, n.user_id, n.sender_id, n.type, n.reference_id, n.is_read, n.created_at,
                       u.username AS sender_username, u.profile_image AS sender_profile_image
                FROM notifications n
                INNER JOIN users u ON n.sender_id = u.id
                WHERE n.user_id = @user_id
                ORDER BY n.created_at DESC
            `);

        res.json({ success: true, notifications: result.recordset });
    } catch (error) {
        next(error);
    }
};

// Marcar una notificación individual como leída
const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const notificationId = req.params.id;

        await poolConnect;
        await pool.request()
            .input('id', sql.Int, notificationId)
            .input('user_id', sql.Int, userId)
            .query('UPDATE notifications SET is_read = 1 WHERE id = @id AND user_id = @user_id');

        res.json({ success: true, message: 'Notificación marcada como leída' });
    } catch (error) {
        next(error);
    }
};

// Marcar todas las notificaciones del usuario como leídas
const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        await poolConnect;
        await pool.request()
            .input('user_id', sql.Int, userId)
            .query('UPDATE notifications SET is_read = 1 WHERE user_id = @user_id');

        res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        next(error);
    }
};

// Helper interno estático para inyectar alertas desde otros controladores
const createNotification = async (userId, senderId, type, referenceId) => {
    try {
        // Evitar notificarse a uno mismo
        if (userId.toString() === senderId.toString()) return false;

        await poolConnect;
        await pool.request()
            .input('user_id', sql.Int, userId)
            .input('sender_id', sql.Int, senderId)
            .input('type', sql.VarChar, type)
            .input('reference_id', sql.VarChar, referenceId ? referenceId.toString() : null)
            .query(`
                INSERT INTO notifications (user_id, sender_id, type, reference_id)
                VALUES (@user_id, @sender_id, @type, @reference_id)
            `);
        return true;
    } catch (err) {
        console.error('Error in createNotification helper:', err);
        return false;
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
};
