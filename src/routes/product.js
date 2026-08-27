'use strict';

const router = require('express').Router();
const { checkLogin, checkAdmin } = require('../middleware/auth');
const productController = require('../controllers/product');

router.get('/', checkLogin, productController.listProducts);
router.post('/', checkLogin, checkAdmin, productController.addProduct);

module.exports = router;
