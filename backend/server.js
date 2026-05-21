const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Configuración de DB y pool
require('./config/db');

const errorHandler = require('./middlewares/errorHandler');

// Rutas
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const forumRoutes = require('./routes/forum.routes');
const gamesRoutes = require('./routes/games.routes');
const userGamesRoutes = require('./routes/user_games.routes');
const clipsRoutes = require('./routes/clips.routes');
const connectionsRoutes = require('./routes/connections.routes');
const rankingsRoutes = require('./routes/rankings.routes');
const notificationsRoutes = require('./routes/notifications.routes');

const app = express();

// =========================
// MIDDLEWARES
// =========================
app.use(cors({
    origin: "https://re-gaming-prime.vercel.app/index.html",
    credentials: true
}));
app.use(express.json());

// =========================
// RUTAS API
// =========================
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/clips', clipsRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/user-games', userGamesRoutes);
app.use('/api/notifications', notificationsRoutes);
// Servir archivos estáticos se hace directamente
// uploads y raíz se configuran abajo

// =========================
// SERVIR ARCHIVOS ESTÁTICOS
// =========================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..')));

// =========================
// MANEJO GLOBAL DE ERRORES
// =========================
app.use(errorHandler);

// =========================
// INICIAR SERVIDOR
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});