const express = require('express');
const router = express.Router();
const { getUserGames, addUserGame, deleteUserGame } = require('../controllers/user_games.controller');
const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', getUserGames); // GET /api/user-games
router.post('/', addUserGame); // POST /api/user-games
router.delete('/:game_id', deleteUserGame); // DELETE /api/user-games/:game_id

module.exports = router;
