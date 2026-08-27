'use strict';

const router = require('express').Router();
const { checkLogin } = require('../middleware/auth');
const authController = require('../controllers/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', checkLogin, authController.me);

module.exports = router;
