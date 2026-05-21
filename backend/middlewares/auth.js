const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No se proporcionó token de autenticación' });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'regaming_secret';
        
        const decoded = jwt.verify(token, secret);
        
        // Mapear userId a id para mantener compatibilidad con todo el backend
        req.user = {
            id: decoded.userId,
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
};

module.exports = { authMiddleware };
