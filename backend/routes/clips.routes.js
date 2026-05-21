const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
    getAllClips,
    uploadClip,
    toggleLike,
    incrementViews,
    getComments,
    addComment
} = require('../controllers/clips.controller');
const { authMiddleware } = require('../middlewares/auth');

// Configuración de multer para videos (50MB MAX)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/clips');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.userId + '-clip-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/webm'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de video no soportado. Solo MP4 o WEBM.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: fileFilter
});

router.get('/', getAllClips);
router.post('/', authMiddleware, upload.single('video'), uploadClip);
router.post('/:id/like', authMiddleware, toggleLike);
router.post('/:id/view', incrementViews);
router.get('/:id/comments', getComments);
router.post('/:id/comments', authMiddleware, addComment);

module.exports = router;
