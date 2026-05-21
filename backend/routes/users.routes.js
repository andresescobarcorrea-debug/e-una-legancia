const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getProfile, getTopUsers, uploadProfileImage, uploadProfileBackground, getUserPublicProfile } = require('../controllers/users.controller');
const { authMiddleware } = require('../middlewares/auth');

// Configuración de multer para avatar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/profile');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Configuración de multer para fondo de perfil
const storageBackground = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/background');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.userId + '-bg-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadBackground = multer({ storage: storageBackground });

router.get('/profile', authMiddleware, getProfile);
router.get('/:id/profile', authMiddleware, getUserPublicProfile);
router.post('/profile-image', authMiddleware, upload.single('image'), uploadProfileImage);
router.post('/profile-background', authMiddleware, uploadBackground.single('background'), uploadProfileBackground);
router.get('/top', getTopUsers); // Público

module.exports = router;

