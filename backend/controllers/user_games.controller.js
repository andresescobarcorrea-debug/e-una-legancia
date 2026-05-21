const { pool, poolConnect, sql } = require('../config/db');

// GET /api/user-games -> lista de juegos guardados del usuario autenticado
const getUserGames = async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.id)
      .query('SELECT * FROM user_games WHERE user_id = @user_id ORDER BY created_at DESC');
    res.json({ success: true, games: result.recordset });
  } catch (err) {
    next(err);
  }
};

// POST /api/user-games -> guarda juego favorito
const addUserGame = async (req, res, next) => {
  try {
    let { game_id, game_name, game_image, rating, released } = req.body;
    
    // Validar y limpiar fecha para evitar errores de conversión en SQL Server
    let parsedReleased = null;
    if (released && released !== 'N/A' && released !== '') {
      const dateVal = new Date(released);
      if (!isNaN(dateVal.getTime())) {
        parsedReleased = dateVal.toISOString().split('T')[0];
      }
    }
    
    // Si no es una fecha válida, usar fecha actual por defecto
    if (!parsedReleased) {
      parsedReleased = new Date().toISOString().split('T')[0];
    }
    
    // Asegurar que rating es flotante válido
    const parsedRating = parseFloat(rating) || 0;
    
    // Truncar textos para evitar desbordamiento de columna en SQL Server
    const cleanGameName = game_name ? game_name.substring(0, 255) : 'Juego';
    const cleanGameImage = game_image ? game_image.substring(0, 500) : null;

    await poolConnect;
    await pool.request()
      .input('user_id', sql.Int, req.user.id)
      .input('game_id', sql.VarChar, game_id)
      .input('game_name', sql.VarChar, cleanGameName)
      .input('game_image', sql.VarChar, cleanGameImage)
      .input('rating', sql.Float, parsedRating)
      .input('released', sql.Date, parsedReleased)
      .query(`IF NOT EXISTS (SELECT 1 FROM user_games WHERE user_id = @user_id AND game_id = @game_id)
        INSERT INTO user_games (user_id, game_id, game_name, game_image, rating, released)
        VALUES (@user_id, @game_id, @game_name, @game_image, @rating, @released)`);
    res.json({ success: true, message: 'Juego añadido a tu lista' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/user-games/:game_id -> elimina juego de la lista
const deleteUserGame = async (req, res, next) => {
  try {
    const { game_id } = req.params;
    await poolConnect;
    await pool.request()
      .input('user_id', sql.Int, req.user.id)
      .input('game_id', sql.VarChar, game_id)
      .query('DELETE FROM user_games WHERE user_id = @user_id AND game_id = @game_id');
    res.json({ success: true, message: 'Juego eliminado de tu lista' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserGames, addUserGame, deleteUserGame };
