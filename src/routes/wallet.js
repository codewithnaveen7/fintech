'use strict';

const router = require('express').Router();
const { checkLogin } = require('../middleware/auth');
const walletController = require('../controllers/wallet');

router.get('/balance', checkLogin, walletController.getBalance);

module.exports = router;
