const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'No tienes permisos para esta acción' });
        }
        next();
    };
};
module.exports = verifyRole;
