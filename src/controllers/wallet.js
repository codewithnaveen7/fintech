'use strict';

const { Wallet, LedgerEntry } = require('../../models');
const { addMoney } = require('../services/wallet');

async function getBalance(req, res) {
  const wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
  if (!wallet) {
    return res.status(404).json({ message: 'wallet not found' });
  }

  res.json({
    available_balance: wallet.available_balance,
    locked_balance: wallet.locked_balance,
  });
}

async function addMoneyToWallet(req, res) {
  const amount = req.body.amount;
  const idempotencyKey = (req.headers['idempotency-key'] || '').trim();

  if (!idempotencyKey) {
    return res.status(400).json({ message: 'Idempotency-Key header is required' });
  }

  if (amount == null || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
    return res.status(400).json({ message: 'amount must be greater than 0' });
  }

  const result = await addMoney(req.user.id, amount, idempotencyKey);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }

  res.json(result.data);
}

async function getStatement(req, res) {
  const entries = await LedgerEntry.findAll({
    where: { user_id: req.user.id },
    order: [['createdAt', 'DESC']],
  });

  const statement = entries.map((row) => ({
    transaction_id: row.transaction_id,
    transaction_type: row.transaction_type,
    debit: row.debit,
    credit: row.credit,
    opening_balance: row.opening_balance,
    closing_balance: row.closing_balance,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    metadata: row.metadata,
    created_at: row.createdAt,
  }));

  res.json({ statement });
}

module.exports = { getBalance, addMoneyToWallet, getStatement };
