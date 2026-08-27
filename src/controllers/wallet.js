'use strict';

const { Wallet } = require('../../models');

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

module.exports = { getBalance };
