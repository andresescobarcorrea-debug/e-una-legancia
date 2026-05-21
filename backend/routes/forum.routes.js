const express = require('express');
const router = express.Router();
const { 
    getDebates, 
    createDebate, 
    getDebateComments, 
    addComment, 
    vote,
    getFriends,
    createGroup,
    getMyGroups,
    getGroupParticipants,
    sendFriendRequest,
    acceptFriendRequest,
    searchUsers
} = require('../controllers/forum.controller');
const { authMiddleware } = require('../middlewares/auth');

router.get('/debates', getDebates);
router.post('/debates', authMiddleware, createDebate);
router.get('/debates/:id/comments', getDebateComments);
router.post('/debates/:id/comments', authMiddleware, addComment);
router.post('/vote', authMiddleware, vote);

// Rutas de Amigos y Grupos
router.get('/friends', authMiddleware, getFriends);
router.get('/users/search', authMiddleware, searchUsers);
router.post('/friends/request', authMiddleware, sendFriendRequest);
router.post('/friends/accept', authMiddleware, acceptFriendRequest);
router.post('/groups', authMiddleware, createGroup);
router.get('/my-groups', authMiddleware, getMyGroups);
router.get('/debates/:id/participants', authMiddleware, getGroupParticipants);

module.exports = router;
