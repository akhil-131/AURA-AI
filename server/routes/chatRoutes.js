const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/new', chatController.createNewChat);
router.get('/history/:chatId', chatController.getChatHistory);
router.post('/stream', chatController.streamChat);
router.get('/user/:userId', chatController.getUserChats);
router.delete('/:chatId', chatController.deleteChat);
router.put('/:chatId', chatController.renameChat);
router.put('/:chatId/pin', chatController.pinChat);

module.exports = router;