const express = require('express');
const router = express.Router();
const rankingsController = require('../controllers/rankings.controller');
const { authMiddleware } = require('../middlewares/auth');

// Obtener todos los rankings (público)
router.get('/', rankingsController.getItems);

// Votar por un ítem (protegido)
router.post('/:id/vote', authMiddleware, rankingsController.voteItem);

module.exports = router;
