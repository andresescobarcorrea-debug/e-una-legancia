const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, poolConnect, sql } = require('../config/db');

const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
        }

        await poolConnect;

        // Verificar si el usuario o email ya existen
        const checkUser = await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .query('SELECT id FROM users WHERE username = @username OR email = @email');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'El usuario o el correo ya están en uso' });
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .input('password_hash', sql.VarChar, passwordHash)
            .query(`
                INSERT INTO users (username, email, password_hash) 
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.role_id 
                VALUES (@username, @email, @password_hash)
            `);

        const newUser = result.recordset[0];

        // Crear preferencias por defecto
        await pool.request()
            .input('user_id', sql.Int, newUser.id)
            .query('INSERT INTO user_preferences (user_id) VALUES (@user_id)');

        // Generar JWT
        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username, role: newUser.role_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: newUser.id,
                username: newUser.username
            }
        });

    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Usuario y contraseña obligatorios' });
        }

        await poolConnect;

        // Buscar usuario (puede ser por username o email)
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT * FROM users WHERE username = @username OR email = @username');

        if (result.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Credenciales incorrectas' });
        }

        const user = result.recordset[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(400).json({ success: false, message: 'Credenciales incorrectas' });
        }

        // Generar JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                profile_image: user.profile_image
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login
};
