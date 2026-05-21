const { pool, poolConnect, sql } = require('../config/db');
const { createNotification } = require('./notifications.controller');

const getDebates = async (req, res, next) => {
    try {
        await poolConnect;
        const result = await pool.request()
            .query(`
                SELECT d.id, d.title, '' as description, d.created_at, u.username,
                (SELECT COUNT(*) FROM comments c WHERE c.debate_id = d.id) as comments_count,
                (SELECT COUNT(*) FROM votes v WHERE v.debate_id = d.id) as score
                FROM debates d
                JOIN users u ON d.user_id = u.id
                ORDER BY d.created_at DESC
            `);
        res.json({ success: true, debates: result.recordset });
    } catch (error) {
        next(error);
    }
};

const createDebate = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        const userId = req.user.userId;

        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Título y descripción son obligatorios' });
        }

        await poolConnect;
        
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('title', sql.VarChar, title)
            .input('content', sql.Text, description)
            .query(`
                INSERT INTO debates (user_id, title, content)
                OUTPUT INSERTED.*
                VALUES (@user_id, @title, @content)
            `);
        
        // Sumar puntos al usuario por crear un debate
        await pool.request()
            .input('user_id', sql.Int, userId)
            .query('UPDATE users SET score = score + 10 WHERE id = @user_id');

        res.status(201).json({ success: true, message: 'Debate creado', debate: result.recordset[0] });
    } catch (error) {
        next(error);
    }
};

const getDebateComments = async (req, res, next) => {
    try {
        const { id } = req.params;
        await poolConnect;
        const result = await pool.request()
            .input('debate_id', sql.Int, id)
            .query(`
                SELECT c.id, c.content, c.created_at, u.username,
                0 as score
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.debate_id = @debate_id
                ORDER BY c.created_at ASC
            `);
        res.json({ success: true, comments: result.recordset });
    } catch (error) {
        next(error);
    }
};

const addComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        if (!content) {
            return res.status(400).json({ success: false, message: 'El contenido es obligatorio' });
        }

        await poolConnect;
        const result = await pool.request()
            .input('debate_id', sql.Int, id)
            .input('user_id', sql.Int, userId)
            .input('content', sql.Text, content)
            .query(`
                INSERT INTO comments (debate_id, user_id, content)
                OUTPUT INSERTED.*
                VALUES (@debate_id, @user_id, @content)
            `);
            
        // Sumar puntos al usuario por comentar
        await pool.request()
            .input('user_id', sql.Int, userId)
            .query('UPDATE users SET score = score + 5 WHERE id = @user_id');

        // Notificaciones: Verificar si es un chat grupal o DM
        const participantsRes = await pool.request()
            .input('debate_id', sql.Int, id)
            .query('SELECT user_id FROM group_participants WHERE debate_id = @debate_id');
        
        const participants = participantsRes.recordset;
        if (participants.length > 0) {
            // Es un chat privado / grupal!
            // Notificar a todos los demás participantes del chat!
            for (const participant of participants) {
                if (participant.user_id !== userId) {
                    await createNotification(participant.user_id, userId, 'chat_message', id);
                }
            }
        } else {
            // Es un debate de foro normal!
            // Notificar al dueño del debate
            const debateOwnerRes = await pool.request()
                .input('debate_id', sql.Int, id)
                .query('SELECT user_id FROM debates WHERE id = @debate_id');
            const debateOwnerId = debateOwnerRes.recordset[0]?.user_id;
            
            if (debateOwnerId && debateOwnerId !== userId) {
                await createNotification(debateOwnerId, userId, 'forum_comment', id);
            }
        }

        // Buscar y notificar menciones con @username en comentarios del foro
        const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            const mentionedUsername = match[1];
            const userRes = await pool.request()
                .input('username', sql.VarChar, mentionedUsername)
                .query('SELECT id FROM users WHERE username = @username');
            const mentionedUserId = userRes.recordset[0]?.id;
            if (mentionedUserId && mentionedUserId !== userId) {
                await createNotification(mentionedUserId, userId, 'mention', id);
            }
        }

        res.status(201).json({ success: true, message: 'Comentario añadido', comment: result.recordset[0] });
    } catch (error) {
        next(error);
    }
};

const vote = async (req, res, next) => {
    try {
        const { targetType, targetId, value } = req.body; // targetType: 'debate' | 'comment', value: 1 | -1
        const userId = req.user.userId;

        if (!['debate', 'comment'].includes(targetType) || ![1, -1].includes(value)) {
            return res.status(400).json({ success: false, message: 'Datos de voto inválidos' });
        }

        await poolConnect;

        // Intentar actualizar si ya existe, o insertar si no
        await pool.request()
            .input('user_id', sql.Int, userId)
            .input('target_type', sql.VarChar, targetType)
            .input('target_id', sql.Int, targetId)
            .input('value', sql.Int, value)
            .query(`
                MERGE votes AS target
                USING (SELECT @user_id AS user_id, @target_type AS target_type, @target_id AS target_id, @value AS value) AS source
                ON (target.user_id = source.user_id AND target.target_type = source.target_type AND target.target_id = source.target_id)
                WHEN MATCHED THEN
                    UPDATE SET value = source.value
                WHEN NOT MATCHED THEN
                    INSERT (user_id, target_type, target_id, value)
                    VALUES (source.user_id, source.target_type, source.target_id, source.value);
            `);

        // Notificar voto de debate
        if (targetType === 'debate') {
            const debateOwnerRes = await pool.request()
                .input('debate_id', sql.Int, targetId)
                .query('SELECT user_id FROM debates WHERE id = @debate_id');
            const debateOwnerId = debateOwnerRes.recordset[0]?.user_id;
            
            if (debateOwnerId && debateOwnerId !== userId) {
                await createNotification(debateOwnerId, userId, 'forum_vote', targetId);
            }
        }

        // Idealmente también se actualizaría el score del usuario dueño del post, pero lo simplificamos aquí
        res.json({ success: true, message: 'Voto registrado' });
    } catch (error) {
        next(error);
    }
};

const getFriends = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await poolConnect;
        
        let result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT u.id, u.username, u.score,
                'online' as status
                FROM friends f
                JOIN users u ON f.friend_id = u.id
                WHERE f.user_id = @user_id AND f.status = 'accepted'
            `);
            
        if (result.recordset.length === 0) {
            await pool.request()
                .input('user_id', sql.Int, userId)
                .query(`
                    DECLARE @GamerId INT;
                    DECLARE seed_cursor CURSOR FOR
                    SELECT id FROM users WHERE username IN ('GamerPro_99', 'CyberPanda', 'LaraCraft', 'MasterChief', 'Slayer_x');
                    
                    OPEN seed_cursor;
                    FETCH NEXT FROM seed_cursor INTO @GamerId;
                    
                    WHILE @@FETCH_STATUS = 0
                    BEGIN
                        IF @user_id <> @GamerId
                        BEGIN
                            IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = @user_id AND friend_id = @GamerId)
                                INSERT INTO friends (user_id, friend_id, status) VALUES (@user_id, @GamerId, 'accepted');
                            
                            IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = @GamerId AND friend_id = @user_id)
                                INSERT INTO friends (user_id, friend_id, status) VALUES (@GamerId, @user_id, 'accepted');
                        END
                        FETCH NEXT FROM seed_cursor INTO @GamerId;
                    END
                    CLOSE seed_cursor;
                    DEALLOCATE seed_cursor;
                `);
                
            result = await pool.request()
                .input('user_id', sql.Int, userId)
                .query(`
                    SELECT u.id, u.username, u.score,
                    'online' as status
                    FROM friends f
                    JOIN users u ON f.friend_id = u.id
                    WHERE f.user_id = @user_id AND f.status = 'accepted'
                `);
        }
        
        res.json({ success: true, friends: result.recordset });
    } catch (error) {
        next(error);
    }
};

const createGroup = async (req, res, next) => {
    try {
        const { title, participantIds } = req.body;
        const userId = req.user.userId;

        if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
            return res.status(400).json({ success: false, message: 'Debe haber al menos 1 participante en el chat.' });
        }

        await poolConnect;

        // Si es un DM (exactamente 1 participante además de ti)
        if (participantIds.length === 1) {
            const friendId = parseInt(participantIds[0]);
            
            const existingDM = await pool.request()
                .input('user_id', sql.Int, userId)
                .input('friend_id', sql.Int, friendId)
                .query(`
                    SELECT TOP 1 gp.debate_id
                    FROM group_participants gp
                    WHERE gp.debate_id IN (
                        SELECT debate_id
                        FROM group_participants
                        GROUP BY debate_id
                        HAVING COUNT(*) = 2
                    )
                    AND gp.user_id IN (@user_id, @friend_id)
                    GROUP BY gp.debate_id
                    HAVING COUNT(*) = 2
                `);
                
            if (existingDM.recordset.length > 0) {
                const debateId = existingDM.recordset[0].debate_id;
                const debateRes = await pool.request()
                    .input('debate_id', sql.Int, debateId)
                    .query('SELECT TOP 1 * FROM debates WHERE id = @debate_id');
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'DM existente recuperado', 
                    group: debateRes.recordset[0] 
                });
            }
        }

        const debateResult = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('title', sql.VarChar, title || 'Grupo Nuevo')
            .input('content', sql.NVarChar, 'Inicio del chat de grupo')
            .query(`
                INSERT INTO debates (user_id, title, content)
                OUTPUT INSERTED.*
                VALUES (@user_id, @title, @content)
            `);
        const group = debateResult.recordset[0];
        const debateId = group.id;

        // Insertar creador en group_participants
        await pool.request()
            .input('debate_id', sql.Int, debateId)
            .input('user_id', sql.Int, userId)
            .query('INSERT INTO group_participants (debate_id, user_id) VALUES (@debate_id, @user_id)');
            
        // Insertar participantes
        for (const pId of participantIds) {
            await pool.request()
                .input('debate_id', sql.Int, debateId)
                .input('user_id', sql.Int, parseInt(pId))
                .query('IF NOT EXISTS (SELECT 1 FROM group_participants WHERE debate_id = @debate_id AND user_id = @user_id) INSERT INTO group_participants (debate_id, user_id) VALUES (@debate_id, @user_id)');
        }

        res.status(201).json({ success: true, message: 'Grupo creado exitosamente', group });
    } catch (error) {
        next(error);
    }
};

const getMyGroups = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await poolConnect;
        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT d.id, d.title, d.created_at, u.username,
                (SELECT COUNT(*) FROM comments c WHERE c.debate_id = d.id) as comments_count,
                (SELECT TOP 1 c.content FROM comments c WHERE c.debate_id = d.id ORDER BY c.created_at DESC) as last_message,
                (SELECT TOP 1 c.created_at FROM comments c WHERE c.debate_id = d.id ORDER BY c.created_at DESC) as last_message_at
                FROM debates d
                JOIN group_participants gp ON d.id = gp.debate_id
                JOIN users u ON d.user_id = u.id
                WHERE gp.user_id = @user_id
                ORDER BY COALESCE((SELECT MAX(c.created_at) FROM comments c WHERE c.debate_id = d.id), d.created_at) DESC
            `);
        res.json({ success: true, debates: result.recordset });
    } catch (error) {
        next(error);
    }
};

const getGroupParticipants = async (req, res, next) => {
    try {
        const { id } = req.params;
        await poolConnect;
        const result = await pool.request()
            .input('debate_id', sql.Int, id)
            .query(`
                SELECT u.id, u.username 
                FROM group_participants gp
                JOIN users u ON gp.user_id = u.id
                WHERE gp.debate_id = @debate_id
            `);
        res.json({ success: true, participants: result.recordset });
    } catch (error) {
        next(error);
    }
};

const sendFriendRequest = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.body;
        
        if (!friendId) return res.status(400).json({ success: false, message: 'ID de amigo es obligatorio' });
        if (userId.toString() === friendId.toString()) return res.status(400).json({ success: false, message: 'No puedes enviarte solicitud a ti mismo' });

        await poolConnect;

        // Verificar si ya existe relación
        const check = await pool.request()
            .input('user_id', sql.Int, userId)
            .input('friend_id', sql.Int, friendId)
            .query('SELECT status FROM friends WHERE (user_id = @user_id AND friend_id = @friend_id) OR (user_id = @friend_id AND friend_id = @user_id)');

        if (check.recordset.length > 0) {
            const status = check.recordset[0].status;
            return res.json({ success: true, message: `Ya existe una relación o solicitud activa (${status})` });
        }

        // Crear relación como pending (el que envía)
        await pool.request()
            .input('user_id', sql.Int, userId)
            .input('friend_id', sql.Int, friendId)
            .query("INSERT INTO friends (user_id, friend_id, status) VALUES (@user_id, @friend_id, 'pending')");

        // Crear notificación para friendId
        await createNotification(friendId, userId, 'friend_request', null);

        res.json({ success: true, message: 'Solicitud de amistad enviada exitosamente' });
    } catch (error) {
        next(error);
    }
};

const acceptFriendRequest = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.body; // El que envió la solicitud

        if (!friendId) return res.status(400).json({ success: false, message: 'ID de amigo es obligatorio' });

        await poolConnect;

        // Actualizar el estado a accepted
        const updateRes = await pool.request()
            .input('user_id', sql.Int, friendId)
            .input('friend_id', sql.Int, userId)
            .query("UPDATE friends SET status = 'accepted' WHERE user_id = @user_id AND friend_id = @friend_id AND status = 'pending'");

        if (updateRes.rowsAffected[0] > 0) {
            // Insertar la relación bidireccional si no existe
            await pool.request()
                .input('user_id', sql.Int, userId)
                .input('friend_id', sql.Int, friendId)
                .query("IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = @user_id AND friend_id = @friend_id) INSERT INTO friends (user_id, friend_id, status) VALUES (@user_id, @friend_id, 'accepted')");

            // Crear notificación para friendId
            await createNotification(friendId, userId, 'friend_accept', null);
            
            res.json({ success: true, message: 'Solicitud de amistad aceptada' });
        } else {
            res.status(400).json({ success: false, message: 'No hay ninguna solicitud pendiente de este usuario' });
        }
    } catch (error) {
        next(error);
    }
};

const searchUsers = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const userId = req.user.userId;

        if (query.trim().length === 0) {
            return res.json({ success: true, users: [] });
        }

        await poolConnect;
        const result = await pool.request()
            .input('query', sql.VarChar, `%${query}%`)
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT id, username, profile_image, score
                FROM users
                WHERE username LIKE @query AND id <> @user_id
                ORDER BY username ASC
            `);

        res.json({ success: true, users: result.recordset });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDebates,
    createDebate,
    getDebateComments,
    addComment,
    vote,
    getFriends,
    createGroup,
    getMyGroups,
    getGroupParticipants,
    sendFriendRequest,
    acceptFriendRequest,
    searchUsers
};
