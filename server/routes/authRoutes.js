const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { signup, login } = require('../controllers/authController');
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post('/signup', signup);
router.post('/login', login);
router.put('/update', authController.updateProfile);
router.get('/me/:id', authController.getMe);


module.exports = router;