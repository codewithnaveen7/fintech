'use strict';

const router = require('express').Router();
const { checkLogin, checkAdmin } = require('../middleware/auth');
const adminWithdrawalController = require('../controllers/admin-withdrawal');

router.get('/withdrawals/pending', checkLogin, checkAdmin, adminWithdrawalController.listPending);
router.post('/withdrawals/:id/approve', checkLogin, checkAdmin, adminWithdrawalController.approve);
router.post('/withdrawals/:id/reject', checkLogin, checkAdmin, adminWithdrawalController.reject);

module.exports = router;
