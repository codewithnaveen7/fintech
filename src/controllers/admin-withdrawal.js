'use strict';

const {
  listPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} = require('../services/withdrawal');

async function listPending(req, res) {
  const withdrawals = await listPendingWithdrawals();
  res.json({ withdrawals });
}

async function approve(req, res) {
  const result = await approveWithdrawal(req.user.id, req.params.id);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  res.json(result.data);
}

async function reject(req, res) {
  const result = await rejectWithdrawal(req.user.id, req.params.id);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  res.json(result.data);
}

module.exports = { listPending, approve, reject };
