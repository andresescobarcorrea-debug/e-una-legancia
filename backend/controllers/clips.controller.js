const { pool, poolConnect, sql } = require('../config/db');
const { createNotification } = require('./notifications.controller');

// GET /api/clips
const getAllClips = async (req, res, next) => {
    try {
        const { game } = req.query;
        let query = `
            SELECT 
                c.id, c.video_url, c.title, c.game_name, c.views, c.created_at,
                c.user_id, u.username, u.profile_image,
                (SELECT COUNT(*) FROM clip_likes WHERE clip_id = c.id) as likes_count,
                (SELECT COUNT(*) FROM clip_comments WHERE clip_id = c.id) as comments_count
            FROM clips c
            INNER JOIN users u ON c.user_id = u.id
        `;

        if (game) {
            query += ` WHERE c.game_name = @game `;
        }
        query += ` ORDER BY c.created_at DESC`;

        await poolConnect;
        const request = pool.request();
        if (game) {
            request.input('game', sql.VarChar, game);
        }
        const result = await request.query(query);

        res.json({ success: true, clips: result.recordset });
    } catch (error) {
        next(error);
    }
};

// POST /api/clips
const uploadClip = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún video' });
        }

        const { title, game_name } = req.body;
        if (!title || !game_name) {
            return res.status(400).json({ success: false, message: 'Título y juego son obligatorios' });
        }

        const userId = req.user.userId;
        const videoUrl = `/uploads/clips/${req.file.filename}`;

        await poolConnect;
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('game_name', sql.VarChar, game_name)
            .input('video_url', sql.VarChar, videoUrl)
            .input('title', sql.VarChar, title)
            .query(`
                INSERT INTO clips (user_id, game_name, video_url, title) 
                OUTPUT INSERTED.* 
                VALUES (@user_id, @game_name, @video_url, @title)
            `);

        res.status(201).json({ success: true, message: 'Clip publicado', clip: result.recordset[0] });
    } catch (error) {
        next(error);
    }
};

// POST /api/clips/:id/like
const toggleLike = async (req, res, next) => {
    try {
        const clipId = req.params.id;
        const userId = req.user.userId;

        await poolConnect;
        
        // Verificar si ya dio like
        const check = await pool.request()
            .input('clip_id', sql.Int, clipId)
            .input('user_id', sql.Int, userId)
            .query('SELECT * FROM clip_likes WHERE clip_id = @clip_id AND user_id = @user_id');

        let liked = false;

        if (check.recordset.length > 0) {
            // Quitar like
            await pool.request()
                .input('clip_id', sql.Int, clipId)
                .input('user_id', sql.Int, userId)
                .query('DELETE FROM clip_likes WHERE clip_id = @clip_id AND user_id = @user_id');
        } else {
            // Dar like
            await pool.request()
                .input('clip_id', sql.Int, clipId)
                .input('user_id', sql.Int, userId)
                .query('INSERT INTO clip_likes (clip_id, user_id) VALUES (@clip_id, @user_id)');
            liked = true;

            // Notificación de like en clip
            const clipOwnerRes = await pool.request()
                .input('clip_id', sql.Int, clipId)
                .query('SELECT user_id FROM clips WHERE id = @clip_id');
            const clipOwnerId = clipOwnerRes.recordset[0]?.user_id;
            if (clipOwnerId && clipOwnerId !== userId) {
                await createNotification(clipOwnerId, userId, 'clip_like', clipId);
            }
        }

        // Obtener nuevo conteo
        const countRes = await pool.request()
            .input('clip_id', sql.Int, clipId)
            .query('SELECT COUNT(*) as total FROM clip_likes WHERE clip_id = @clip_id');

        res.json({ success: true, liked, likes_count: countRes.recordset[0].total });
    } catch (error) {
        next(error);
    }
};

// POST /api/clips/:id/view
const incrementViews = async (req, res, next) => {
    try {
        const clipId = req.params.id;
        await poolConnect;
        await pool.request()
            .input('clip_id', sql.Int, clipId)
            .query('UPDATE clips SET views = views + 1 WHERE id = @clip_id');
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// GET /api/clips/:id/comments
const getComments = async (req, res, next) => {
    try {
        const clipId = req.params.id;
        await poolConnect;
        const result = await pool.request()
            .input('clip_id', sql.Int, clipId)
            .query(`
                SELECT c.id, c.content, c.created_at, c.user_id, u.username, u.profile_image 
                FROM clip_comments c
                INNER JOIN users u ON c.user_id = u.id
                WHERE c.clip_id = @clip_id
                ORDER BY c.created_at DESC
            `);
        res.json({ success: true, comments: result.recordset });
    } catch (error) {
        next(error);
    }
};

// POST /api/clips/:id/comments
const addComment = async (req, res, next) => {
    try {
        const clipId = req.params.id;
        const userId = req.user.userId;
        const { content } = req.body;

        if (!content) return res.status(400).json({ success: false, message: 'Comentario vacío' });

        await poolConnect;
        const result = await pool.request()
            .input('clip_id', sql.Int, clipId)
            .input('user_id', sql.Int, userId)
            .input('content', sql.NVarChar, content)
            .query(`
                INSERT INTO clip_comments (clip_id, user_id, content) 
                OUTPUT INSERTED.* 
                VALUES (@clip_id, @user_id, @content)
            `);

        // Notificación de comentario en clip
        const clipOwnerRes = await pool.request()
            .input('clip_id', sql.Int, clipId)
            .query('SELECT user_id FROM clips WHERE id = @clip_id');
        const clipOwnerId = clipOwnerRes.recordset[0]?.user_id;
        if (clipOwnerId && clipOwnerId !== userId) {
            await createNotification(clipOwnerId, userId, 'clip_comment', clipId);
        }

        // Buscar y notificar menciones con @username
        const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            const mentionedUsername = match[1];
            const userRes = await pool.request()
                .input('username', sql.VarChar, mentionedUsername)
                .query('SELECT id FROM users WHERE username = @username');
            const mentionedUserId = userRes.recordset[0]?.id;
            if (mentionedUserId && mentionedUserId !== userId) {
                await createNotification(mentionedUserId, userId, 'mention', clipId);
            }
        }

        res.status(201).json({ success: true, message: 'Comentario agregado', comment: result.recordset[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllClips,
    uploadClip,
    toggleLike,
    incrementViews,
    getComments,
    addComment
};
