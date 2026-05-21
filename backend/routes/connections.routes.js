const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connections.controller');
const { authMiddleware } = require('../middlewares/auth');

// Iniciar autenticación
router.get('/:platform/auth', authMiddleware, connectionsController.initAuth);

// Callback OAuth (no lleva authMiddleware estricto porque la redirección de terceros no manda el Header Bearer, usamos stateToken en query)
router.get('/:platform/callback', connectionsController.callback);

// Obtener conexiones del usuario
router.get('/me', authMiddleware, connectionsController.getMyConnections);

// Desconectar plataforma
router.delete('/:platform', authMiddleware, connectionsController.disconnect);

module.exports = router;