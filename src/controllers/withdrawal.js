'use strict';

const { requestWithdrawal } = require('../services/withdrawal');

async function create(req, res) {
  const amount = req.body.amount;
  const idempotencyKey = (req.headers['idempotency-key'] || '').trim();

  if (!idempotencyKey) {
    return res.status(400).json({ message: 'Idempotency-Key header is required' });
  }

  if (amount == null || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
    return res.status(400).json({ message: 'amount must be greater than 0' });
  }

  const result = await requestWithdrawal(req.user.id, amount, idempotencyKey);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }

  res.status(result.created ? 201 : 200).json(result.data);
}

module.exports = { create };
