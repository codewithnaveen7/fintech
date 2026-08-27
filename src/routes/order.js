'use strict';

const router = require('express').Router();
const { checkLogin } = require('../middleware/auth');
const orderController = require('../controllers/order');

router.post('/', checkLogin, orderController.create);
router.get('/:id', checkLogin, orderController.getOrder);

module.exports = router;
