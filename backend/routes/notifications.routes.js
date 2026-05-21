const express = require('express');
const router = express.Router();
const { 
    getNotifications, 
    markAsRead, 
    markAllAsRead 
} = require('../controllers/notifications.controller');
const { authMiddleware } = require('../middlewares/auth');

// Obtener todas las alertas del usuario logeado
router.get('/', authMiddleware, getNotifications);

// Marcar todas como leídas
router.post('/read-all', authMiddleware, markAllAsRead);

// Marcar una individual como leída
router.post('/:id/read', authMiddleware, markAsRead);

module.exports = router;
