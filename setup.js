const fs = require('fs');
const path = require('path');

const backendDir = path.join(process.cwd(), 'backend');
const dirs = ['config', 'controllers', 'middlewares', 'routes'];

if (!fs.existsSync(backendDir)) fs.mkdirSync(backendDir);
dirs.forEach(d => {
    const p = path.join(backendDir, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p);
});

// package.json
fs.writeFileSync(path.join(backendDir, 'package.json'), JSON.stringify({
    name: 'regaming-backend',
    version: '1.0.0',
    main: 'server.js',
    scripts: {
        'start': 'node server.js',
        'dev': 'nodemon server.js'
    },
    dependencies: {
        'axios': '^1.6.8',
        'bcrypt': '^5.1.1',
        'cors': '^2.8.5',
        'dotenv': '^16.4.5',
        'express': '^4.19.2',
        'jsonwebtoken': '^9.0.2',
        'mssql': '^10.0.2'
    },
    devDependencies: {
        'nodemon': '^3.1.0'
    }
}, null, 2));

// .env
fs.writeFileSync(path.join(backendDir, '.env'), `PORT=3000
DB_USER=sa
DB_PASSWORD=tu_password
DB_SERVER=localhost
DB_NAME=regaming_db
JWT_SECRET=super_secret_key_re_gaming_2026
RAWG_API_KEY=tu_rawg_api_key
`);

// config/db.js
fs.writeFileSync(path.join(backendDir, 'config', 'db.js'), `const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Conectado a SQL Server');
        return pool;
    })
    .catch(err => console.log('❌ Error de conexión a BD: ', err));

module.exports = { sql, poolPromise };
`);

// middlewares/errorHandler.js
fs.writeFileSync(path.join(backendDir, 'middlewares', 'errorHandler.js'), `const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
};
module.exports = errorHandler;
`);

// middlewares/authMiddleware.js
fs.writeFileSync(path.join(backendDir, 'middlewares', 'authMiddleware.js'), `const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ success: false, message: 'Token requerido' });

    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
};

module.exports = verifyToken;
`);

// middlewares/roleMiddleware.js
fs.writeFileSync(path.join(backendDir, 'middlewares', 'roleMiddleware.js'), `const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'No tienes permisos para esta acción' });
        }
        next();
    };
};
module.exports = verifyRole;
`);

// controllers/authController.js
fs.writeFileSync(path.join(backendDir, 'controllers', 'authController.js'), `const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../config/db');

exports.register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const pool = await poolPromise;
        
        const checkUser = await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .query('SELECT id FROM users WHERE username = @username OR email = @email');
            
        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Usuario o email ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .query('INSERT INTO users (username, email, password_hash, role_id) VALUES (@username, @email, @password, 1)');

        res.status(201).json({ success: true, message: 'Usuario registrado exitosamente' });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const pool = await poolPromise;
        
        const userResult = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = @username');
            
        if (userResult.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        const user = userResult.recordset[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

        const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        // No enviamos si es superadmin explícitamente en el public response
        res.json({ success: true, token, username: user.username });
    } catch (error) {
        next(error);
    }
};
`);

// controllers/profileController.js
fs.writeFileSync(path.join(backendDir, 'controllers', 'profileController.js'), `const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res, next) => {
    try {
        const pool = await poolPromise;
        const user = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query('SELECT id, username, email, created_at, (SELECT theme FROM user_preferences WHERE user_id = @id) as theme FROM users WHERE id = @id');
        res.json({ success: true, user: user.recordset[0] });
    } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const pool = await poolPromise;
        const userResult = await pool.request().input('id', sql.Int, req.user.id).query('SELECT password_hash FROM users WHERE id = @id');
        
        const isMatch = await bcrypt.compare(oldPassword, userResult.recordset[0].password_hash);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
        
        const hashedNew = await bcrypt.hash(newPassword, 10);
        await pool.request().input('id', sql.Int, req.user.id).input('pwd', sql.VarChar, hashedNew).query('UPDATE users SET password_hash = @pwd WHERE id = @id');
        res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) { next(error); }
};

exports.changeUsername = async (req, res, next) => {
    try {
        const { newUsername } = req.body;
        const pool = await poolPromise;
        
        // Validación de tiempo se haría aquí comprobando last_username_change
        await pool.request().input('id', sql.Int, req.user.id).input('username', sql.VarChar, newUsername).query('UPDATE users SET username = @username, last_username_change = GETDATE() WHERE id = @id');
        res.json({ success: true, message: 'Nombre de usuario actualizado' });
    } catch (error) { next(error); }
};

exports.savePreferences = async (req, res, next) => {
    try {
        const { theme } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.user.id)
            .input('theme', sql.VarChar, theme)
            .query('IF EXISTS (SELECT * FROM user_preferences WHERE user_id = @id) UPDATE user_preferences SET theme = @theme WHERE user_id = @id ELSE INSERT INTO user_preferences (user_id, theme) VALUES (@id, @theme)');
        res.json({ success: true, message: 'Preferencias guardadas' });
    } catch (error) { next(error); }
};
`);

// controllers/forumController.js
fs.writeFileSync(path.join(backendDir, 'controllers', 'forumController.js'), `const { poolPromise, sql } = require('../config/db');

exports.getDebates = async (req, res, next) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT d.*, u.username, (SELECT COUNT(*) FROM comments c WHERE c.debate_id = d.id) as comment_count FROM debates d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC');
        res.json({ success: true, debates: result.recordset });
    } catch (error) { next(error); }
};

exports.createDebate = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('title', sql.VarChar, title)
            .input('desc', sql.Text, description)
            .query('INSERT INTO debates (user_id, title, description) VALUES (@userId, @title, @desc)');
        res.status(201).json({ success: true, message: 'Debate creado' });
    } catch (error) { next(error); }
};

exports.addComment = async (req, res, next) => {
    try {
        const { debateId, content } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('debateId', sql.Int, debateId)
            .input('content', sql.Text, content)
            .query('INSERT INTO comments (user_id, debate_id, content) VALUES (@userId, @debateId, @content)');
        res.status(201).json({ success: true, message: 'Comentario agregado' });
    } catch (error) { next(error); }
};
`);

// controllers/rankingsController.js
fs.writeFileSync(path.join(backendDir, 'controllers', 'rankingsController.js'), `const { poolPromise, sql } = require('../config/db');

exports.getTopUsers = async (req, res, next) => {
    try {
        const pool = await poolPromise;
        const mostVotes = await pool.request().query('SELECT TOP 1 u.username, COUNT(v.id) as total FROM users u JOIN votes v ON u.id = v.user_id GROUP BY u.username ORDER BY total DESC');
        const mostComments = await pool.request().query('SELECT TOP 1 u.username, COUNT(c.id) as total FROM users u JOIN comments c ON u.id = c.user_id GROUP BY u.username ORDER BY total DESC');
        const mostDebates = await pool.request().query('SELECT TOP 1 u.username, COUNT(d.id) as total FROM users u JOIN debates d ON u.id = d.user_id GROUP BY u.username ORDER BY total DESC');

        res.json({
            success: true,
            data: [
                { name: mostVotes.recordset[0]?.username || 'N/A', stat: \`\${mostVotes.recordset[0]?.total || 0} Votos\`, medal: '🥇', type: 'Más votado' },
                { name: mostComments.recordset[0]?.username || 'N/A', stat: \`\${mostComments.recordset[0]?.total || 0} Comentarios\`, medal: '🥈', type: 'Más activo' },
                { name: mostDebates.recordset[0]?.username || 'N/A', stat: \`\${mostDebates.recordset[0]?.total || 0} Debates\`, medal: '🥉', type: 'Creador' }
            ]
        });
    } catch (error) { next(error); }
};
`);

// controllers/gamesController.js
fs.writeFileSync(path.join(backendDir, 'controllers', 'gamesController.js'), `const axios = require('axios');
let cache = { upcoming: null, popular: null, lastFetch: 0 };
const CACHE_TTL = 3600000; // 1 hora

exports.getUpcoming = async (req, res, next) => {
    try {
        if (cache.upcoming && (Date.now() - cache.lastFetch) < CACHE_TTL && !req.query.platform) {
            return res.json({ success: true, data: cache.upcoming });
        }
        
        const platform = req.query.platform ? \`&platforms=\${req.query.platform}\` : '';
        const page = req.query.page ? \`&page=\${req.query.page}\` : '';
        // Llamada a RAWG
        const response = await axios.get(\`https://api.rawg.io/api/games?dates=2026-05-01,2027-12-31&ordering=released\${platform}\${page}&key=\${process.env.RAWG_API_KEY}\`);
        
        const cleanData = response.data.results.map(g => ({
            id: g.id,
            title: g.name,
            platform: g.platforms?.map(p => p.platform.name).join(', '),
            date: g.released,
            image: g.background_image
        }));

        if(!req.query.platform) { cache.upcoming = cleanData; cache.lastFetch = Date.now(); }
        res.json({ success: true, data: cleanData });
    } catch (error) { 
        // Fallback
        res.json({ success: true, data: [
            { title: "Silksong", platform: "PC, Switch, Xbox", date: "2026-12-01T00:00:00" },
            { title: "GTA VI", platform: "PS5, Xbox Series", date: "2026-10-15T00:00:00" }
        ]});
    }
};

exports.getPopular = async (req, res, next) => {
    try {
        res.json({ success: true, data: [] });
    } catch(err) { next(err); }
};

exports.searchGames = async (req, res, next) => {
    try {
        res.json({ success: true, data: [] });
    } catch(err) { next(err); }
};
`);

// routes/authRoutes.js
fs.writeFileSync(path.join(backendDir, 'routes', 'authRoutes.js'), `const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);

module.exports = router;
`);

// routes/profileRoutes.js
fs.writeFileSync(path.join(backendDir, 'routes', 'profileRoutes.js'), `const express = require('express');
const router = express.Router();
const { getProfile, changePassword, changeUsername, savePreferences } = require('../controllers/profileController');
const verifyToken = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.get('/', getProfile);
router.post('/change-password', changePassword);
router.post('/change-username', changeUsername);
router.post('/preferences', savePreferences);

module.exports = router;
`);

// routes/forumRoutes.js
fs.writeFileSync(path.join(backendDir, 'routes', 'forumRoutes.js'), `const express = require('express');
const router = express.Router();
const { getDebates, createDebate, addComment } = require('../controllers/forumController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/debates', getDebates);
router.post('/debates', verifyToken, createDebate);
router.post('/comments', verifyToken, addComment);

module.exports = router;
`);

// routes/rankingsRoutes.js
fs.writeFileSync(path.join(backendDir, 'routes', 'rankingsRoutes.js'), `const express = require('express');
const router = express.Router();
const { getTopUsers } = require('../controllers/rankingsController');

router.get('/top-users', getTopUsers);

module.exports = router;
`);

// routes/gamesRoutes.js
fs.writeFileSync(path.join(backendDir, 'routes', 'gamesRoutes.js'), `const express = require('express');
const router = express.Router();
const { getUpcoming, getPopular, searchGames } = require('../controllers/gamesController');

router.get('/upcoming', getUpcoming);
router.get('/popular', getPopular);
router.get('/search', searchGames);

module.exports = router;
`);

// server.js
fs.writeFileSync(path.join(backendDir, 'server.js'), `const express = require('express');
const cors = require('cors');
require('dotenv').config();
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const forumRoutes = require('./routes/forumRoutes');
const rankingsRoutes = require('./routes/rankingsRoutes');
const gamesRoutes = require('./routes/gamesRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/games', gamesRoutes);

// Manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 Servidor backend corriendo en http://localhost:\${PORT}\`));
`);

// database.sql
fs.writeFileSync(path.join(backendDir, 'database.sql'), `-- Crear base de datos
CREATE DATABASE regaming_db;
GO
USE regaming_db;
GO

-- Roles
CREATE TABLE roles (
    id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO roles (name) VALUES ('user'), ('superadmin');

-- Usuarios
CREATE TABLE users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL DEFAULT 1 FOREIGN KEY REFERENCES roles(id),
    last_username_change DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Preferencias
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    updated_at DATETIME DEFAULT GETDATE()
);

-- Debates
CREATE TABLE debates (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Comentarios
CREATE TABLE comments (
    id INT PRIMARY KEY IDENTITY(1,1),
    debate_id INT NOT NULL FOREIGN KEY REFERENCES debates(id) ON DELETE CASCADE,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Votos (Genérico para debates, comentarios, etc)
CREATE TABLE votes (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- 'debate', 'comment', 'comparison'
    target_id INT NOT NULL,
    value INT NOT NULL, -- 1 para upvote, -1 para downvote
    created_at DATETIME DEFAULT GETDATE()
);
`);

console.log('✅ Estructura del backend generada correctamente');
