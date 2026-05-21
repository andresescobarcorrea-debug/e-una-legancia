const errorHandler = (err, req, res, next) => {
    console.error('====== ERROR INTERNO DEL SERVIDOR ======');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('========================================');
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: err.message
    });
};

module.exports = errorHandler;
