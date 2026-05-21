const express = require('express');
const router = express.Router();
const { 
    getUpcomingGames, 
    getOffers, 
    getGames, 
    searchGames, 
    getGameById, 
    getPopularGames 
} = require('../controllers/games.controller');

// Endpoints
router.get('/popular', getPopularGames);      // GET /api/games/popular (destacados de index)
router.get('/upcoming', getUpcomingGames);    // GET /api/games/upcoming (próximos lanzamientos reales)
router.get('/offers', getOffers);             // GET /api/games/offers (ofertas)
router.get('/search', searchGames);           // GET /api/games/search (buscador real)
router.get('/:id', getGameById);               // GET /api/games/:id (detalle del juego)
router.get('/', getGames);                     // GET /api/games (catálogo con scroll)

module.exports = router;
