const { pool, poolConnect, sql } = require('../config/db');

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await poolConnect;

        const result = await pool.request()
            .input('id', sql.Int, userId)
            .query(`
                SELECT u.id, u.username, u.email, u.score, u.created_at, u.profile_image, u.profile_background, p.dark_mode 
                FROM users u
                LEFT JOIN user_preferences p ON u.id = p.user_id
                WHERE u.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({ success: true, profile: result.recordset[0] });

    } catch (error) {
        next(error);
    }
};

const getTopUsers = async (req, res, next) => {
    try {
        await poolConnect;

        const result = await pool.request()
            .query(`
                SELECT TOP 10 id, username, score
                FROM users
                ORDER BY score DESC, created_at ASC
            `);

        res.json({ success: true, topUsers: result.recordset });

    } catch (error) {
        next(error);
    }
};

const uploadProfileImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ninguna imagen' });
        }

        const userId = req.user.userId;
        const imageUrl = `/uploads/profile/${req.file.filename}`;

        await poolConnect;
        await pool.request()
            .input('id', sql.Int, userId)
            .input('profile_image', sql.VarChar, imageUrl)
            .query('UPDATE users SET profile_image = @profile_image WHERE id = @id');

        res.json({ success: true, imageUrl });
    } catch (error) {
        next(error);
    }
};

const getUserPublicProfile = async (req, res, next) => {
    try {
        const targetUserId = req.params.id;
        await poolConnect;

        // 1. Obtener información básica del usuario (sin email ni password_hash)
        const userResult = await pool.request()
            .input('id', sql.Int, targetUserId)
            .query(`
                SELECT id, username, score, profile_image, profile_background, created_at
                FROM users
                WHERE id = @id
            `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const profile = userResult.recordset[0];

        // 2. Obtener los juegos agregados reales de este usuario en SQL
        const gamesResult = await pool.request()
            .input('user_id', sql.Int, targetUserId)
            .query('SELECT * FROM user_games WHERE user_id = @user_id ORDER BY created_at DESC');

        res.json({
            success: true,
            profile,
            games: gamesResult.recordset
        });

    } catch (error) {
        next(error);
    }
};

const uploadProfileBackground = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ninguna imagen de fondo' });
        }

        const userId = req.user.userId;
        const backgroundUrl = `/uploads/background/${req.file.filename}`;

        await poolConnect;
        await pool.request()
            .input('id', sql.Int, userId)
            .input('profile_background', sql.VarChar, backgroundUrl)
            .query('UPDATE users SET profile_background = @profile_background WHERE id = @id');

        res.json({ success: true, backgroundUrl });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    getTopUsers,
    uploadProfileImage,
    uploadProfileBackground,
    getUserPublicProfile
};

