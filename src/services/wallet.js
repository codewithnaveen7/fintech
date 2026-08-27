'use strict';

const { randomUUID } = require('crypto');
const { sequelize, Wallet, LedgerEntry, IdempotencyRecord } = require('../../models');

function toMoney(value) {
  return Number(Number(value).toFixed(4));
}

function moneyText(value) {
  return toMoney(value).toFixed(4);
}

async function addMoney(userId, amount, idempotencyKey) {
  const storedKey = userId + ':' + idempotencyKey;
  const creditAmount = toMoney(amount);

  return sequelize.transaction(async (t) => {
    const wallet = await Wallet.findOne({
      where: { user_id: userId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!wallet) {
      return { ok: false, status: 404, message: 'wallet not found' };
    }

    const alreadyThere = await IdempotencyRecord.findOne({
      where: { idempotency_key: storedKey },
      transaction: t,
    });

    if (alreadyThere) {
      if (toMoney(alreadyThere.response.amount) !== creditAmount) {
        return { ok: false, status: 409, message: 'idempotency key already used' };
      }
      return { ok: true, data: alreadyThere.response };
    }

    const openingBalance = toMoney(wallet.available_balance);
    const closingBalance = toMoney(openingBalance + creditAmount);
    const transactionId = randomUUID();
    const ledgerId = randomUUID();

    wallet.available_balance = moneyText(closingBalance);
    wallet.version = (wallet.version || 1) + 1;
    await wallet.save({ transaction: t });

    await LedgerEntry.create(
      {
        id: ledgerId,
        transaction_id: transactionId,
        user_id: userId,
        wallet_id: wallet.id,
        transaction_type: 'WALLET_TOPUP',
        debit: moneyText(0),
        credit: moneyText(creditAmount),
        opening_balance: moneyText(openingBalance),
        closing_balance: moneyText(closingBalance),
        reference_type: 'WALLET',
        reference_id: wallet.id,
        metadata: { source: 'add_money' },
      },
      { transaction: t }
    );

    const payload = {
      transaction_id: transactionId,
      amount: moneyText(creditAmount),
      available_balance: moneyText(closingBalance),
      locked_balance: moneyText(wallet.locked_balance),
    };

    await IdempotencyRecord.create(
      {
        id: randomUUID(),
        idempotency_key: storedKey,
        resource_type: 'WALLET_TOPUP',
        resource_id: ledgerId,
        response: payload,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { transaction: t }
    );

    return { ok: true, data: payload };
  });
}

module.exports = { addMoney };
