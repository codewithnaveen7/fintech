'use strict';

const router = require('express').Router();
const { checkLogin } = require('../middleware/auth');
const withdrawalController = require('../controllers/withdrawal');

router.post('/', checkLogin, withdrawalController.create);

module.exports = router;
