'use strict';

const router = require('express').Router();
const { checkLogin } = require('../middleware/auth');
const walletController = require('../controllers/wallet');

router.get('/balance', checkLogin, walletController.getBalance);
router.post('/add-money', checkLogin, walletController.addMoneyToWallet);
router.get('/statement', checkLogin, walletController.getStatement);

module.exports = router;
