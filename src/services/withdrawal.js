'use strict';

const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Wallet, Withdrawal, LedgerEntry, IdempotencyRecord, AdminAuditLog } = require('../../models');
const { withdrawalQueue } = require('../queues/withdrawal');

function toMoney(value) {
  return Number(Number(value).toFixed(4));
}

function moneyText(value) {
  return toMoney(value).toFixed(4);
}

async function requestWithdrawal(userId, amount, idempotencyKey) {
  const storedKey = userId + ':WITHDRAWAL:' + idempotencyKey;
  const withdrawAmount = toMoney(amount);

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
      if (toMoney(alreadyThere.response.amount) !== withdrawAmount) {
        return { ok: false, status: 409, message: 'idempotency key already used' };
      }
      return { ok: true, created: false, data: alreadyThere.response };
    }

    const openRequest = await Withdrawal.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: ['PENDING', 'PROCESSING'] },
      },
      transaction: t,
    });

    if (openRequest) {
      return { ok: false, status: 409, message: 'withdrawal already in progress' };
    }

    const openingBalance = toMoney(wallet.available_balance);
    if (openingBalance < withdrawAmount) {
      return { ok: false, status: 400, message: 'insufficient balance' };
    }

    const closingBalance = toMoney(openingBalance - withdrawAmount);
    const lockedBalance = toMoney(toMoney(wallet.locked_balance) + withdrawAmount);
    const withdrawalId = randomUUID();
    const withdrawalReference = 'WD-' + randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

    await Withdrawal.create(
      {
        id: withdrawalId,
        user_id: userId,
        withdrawal_reference: withdrawalReference,
        amount: moneyText(withdrawAmount),
        status: 'PENDING',
        idempotency_key: storedKey,
        retry_count: 0,
      },
      { transaction: t }
    );

    wallet.available_balance = moneyText(closingBalance);
    wallet.locked_balance = moneyText(lockedBalance);
    wallet.version = (wallet.version || 1) + 1;
    await wallet.save({ transaction: t });

    await LedgerEntry.create(
      {
        id: randomUUID(),
        transaction_id: randomUUID(),
        user_id: userId,
        wallet_id: wallet.id,
        transaction_type: 'WITHDRAWAL_REQUEST',
        debit: moneyText(withdrawAmount),
        credit: moneyText(0),
        opening_balance: moneyText(openingBalance),
        closing_balance: moneyText(closingBalance),
        reference_type: 'WITHDRAWAL',
        reference_id: withdrawalId,
        metadata: { source: 'request_withdrawal', locked_balance: moneyText(lockedBalance) },
      },
      { transaction: t }
    );

    const payload = {
      id: withdrawalId,
      withdrawal_reference: withdrawalReference,
      amount: moneyText(withdrawAmount),
      status: 'PENDING',
      available_balance: moneyText(closingBalance),
      locked_balance: moneyText(lockedBalance),
    };

    await IdempotencyRecord.create(
      {
        id: randomUUID(),
        idempotency_key: storedKey,
        resource_type: 'WITHDRAWAL',
        resource_id: withdrawalId,
        response: payload,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { transaction: t }
    );

    return { ok: true, created: true, data: payload };
  });
}

async function listPendingWithdrawals() {
  const rows = await Withdrawal.findAll({
    where: { status: 'PENDING' },
    order: [['createdAt', 'ASC']],
  });

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    withdrawal_reference: row.withdrawal_reference,
    amount: row.amount,
    status: row.status,
    created_at: row.createdAt,
  }));
}

async function approveWithdrawal(adminId, withdrawalId) {
  const withdrawal = await Withdrawal.findByPk(withdrawalId);
  if (!withdrawal) {
    return { ok: false, status: 404, message: 'withdrawal not found' };
  }
  if (withdrawal.status !== 'PENDING') {
    return { ok: false, status: 400, message: 'withdrawal is not pending' };
  }

  try {
    await withdrawalQueue.add(
      'process',
      { withdrawalId: withdrawal.id },
      {
        jobId: withdrawal.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );
  } catch (err) {
    if (String(err.message).includes('already exists')) {
      return { ok: false, status: 409, message: 'withdrawal already queued' };
    }
    throw err;
  }

  await AdminAuditLog.create({
    id: randomUUID(),
    admin_id: adminId,
    action: 'APPROVE_WITHDRAWAL',
    resource: 'WITHDRAWAL',
    resource_id: withdrawal.id,
    old_values: { status: 'PENDING' },
    new_values: { queued: true },
  });

  return {
    ok: true,
    data: {
      id: withdrawal.id,
      status: 'PENDING',
      queued: true,
    },
  };
}

async function rejectWithdrawal(adminId, withdrawalId) {
  return sequelize.transaction(async (t) => {
    const withdrawal = await Withdrawal.findOne({
      where: { id: withdrawalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!withdrawal) {
      return { ok: false, status: 404, message: 'withdrawal not found' };
    }
    if (withdrawal.status !== 'PENDING') {
      return { ok: false, status: 400, message: 'withdrawal is not pending' };
    }

    const job = await withdrawalQueue.getJob(withdrawal.id);
    if (job) {
      await job.remove();
    }

    const wallet = await Wallet.findOne({
      where: { user_id: withdrawal.user_id },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const amount = toMoney(withdrawal.amount);
    const openingBalance = toMoney(wallet.available_balance);
    const closingBalance = toMoney(openingBalance + amount);
    const lockedBalance = toMoney(toMoney(wallet.locked_balance) - amount);

    wallet.available_balance = moneyText(closingBalance);
    wallet.locked_balance = moneyText(lockedBalance);
    wallet.version = (wallet.version || 1) + 1;
    await wallet.save({ transaction: t });

    withdrawal.status = 'REJECTED';
    await withdrawal.save({ transaction: t });

    await LedgerEntry.create(
      {
        id: randomUUID(),
        transaction_id: randomUUID(),
        user_id: withdrawal.user_id,
        wallet_id: wallet.id,
        transaction_type: 'WITHDRAWAL_REVERSED',
        debit: moneyText(0),
        credit: moneyText(amount),
        opening_balance: moneyText(openingBalance),
        closing_balance: moneyText(closingBalance),
        reference_type: 'WITHDRAWAL',
        reference_id: withdrawal.id,
        metadata: { source: 'reject_withdrawal' },
      },
      { transaction: t }
    );

    await AdminAuditLog.create(
      {
        id: randomUUID(),
        admin_id: adminId,
        action: 'REJECT_WITHDRAWAL',
        resource: 'WITHDRAWAL',
        resource_id: withdrawal.id,
        old_values: { status: 'PENDING' },
        new_values: { status: 'REJECTED' },
      },
      { transaction: t }
    );

    return {
      ok: true,
      data: {
        id: withdrawal.id,
        status: 'REJECTED',
        available_balance: moneyText(closingBalance),
        locked_balance: moneyText(lockedBalance),
      },
    };
  });
}

async function processWithdrawal(withdrawalId) {
  return sequelize.transaction(async (t) => {
    const withdrawal = await Withdrawal.findOne({
      where: { id: withdrawalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!withdrawal) {
      return;
    }
    if (withdrawal.status === 'PROCESSED' || withdrawal.status === 'REJECTED' || withdrawal.status === 'FAILED') {
      return;
    }

    withdrawal.status = 'PROCESSING';
    withdrawal.retry_count = (withdrawal.retry_count || 0) + 1;
    await withdrawal.save({ transaction: t });

    const wallet = await Wallet.findOne({
      where: { user_id: withdrawal.user_id },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const amount = toMoney(withdrawal.amount);
    if (toMoney(wallet.locked_balance) < amount) {
      throw new Error('locked balance too low');
    }

    const availableBalance = toMoney(wallet.available_balance);
    const lockedBalance = toMoney(toMoney(wallet.locked_balance) - amount);

    wallet.locked_balance = moneyText(lockedBalance);
    wallet.version = (wallet.version || 1) + 1;
    await wallet.save({ transaction: t });

    await LedgerEntry.create(
      {
        id: randomUUID(),
        transaction_id: randomUUID(),
        user_id: withdrawal.user_id,
        wallet_id: wallet.id,
        transaction_type: 'WITHDRAWAL_PROCESSED',
        debit: moneyText(0),
        credit: moneyText(0),
        opening_balance: moneyText(availableBalance),
        closing_balance: moneyText(availableBalance),
        reference_type: 'WITHDRAWAL',
        reference_id: withdrawal.id,
        metadata: { source: 'queue_worker', locked_removed: moneyText(amount) },
      },
      { transaction: t }
    );

    withdrawal.status = 'PROCESSED';
    withdrawal.processed_at = new Date();
    await withdrawal.save({ transaction: t });
  });
}

async function markWithdrawalFailed(withdrawalId, errorMessage) {
  return sequelize.transaction(async (t) => {
    const withdrawal = await Withdrawal.findOne({
      where: { id: withdrawalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!withdrawal) {
      return;
    }
    if (withdrawal.status === 'PROCESSED' || withdrawal.status === 'REJECTED' || withdrawal.status === 'FAILED') {
      return;
    }

    const wallet = await Wallet.findOne({
      where: { user_id: withdrawal.user_id },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const amount = toMoney(withdrawal.amount);
    const openingBalance = toMoney(wallet.available_balance);
    const closingBalance = toMoney(openingBalance + amount);
    const lockedBalance = toMoney(toMoney(wallet.locked_balance) - amount);

    wallet.available_balance = moneyText(closingBalance);
    wallet.locked_balance = moneyText(lockedBalance);
    wallet.version = (wallet.version || 1) + 1;
    await wallet.save({ transaction: t });

    withdrawal.status = 'FAILED';
    withdrawal.failure_reason = errorMessage;
    await withdrawal.save({ transaction: t });

    await LedgerEntry.create(
      {
        id: randomUUID(),
        transaction_id: randomUUID(),
        user_id: withdrawal.user_id,
        wallet_id: wallet.id,
        transaction_type: 'WITHDRAWAL_REVERSED',
        debit: moneyText(0),
        credit: moneyText(amount),
        opening_balance: moneyText(openingBalance),
        closing_balance: moneyText(closingBalance),
        reference_type: 'WITHDRAWAL',
        reference_id: withdrawal.id,
        metadata: { source: 'queue_failed', reason: errorMessage },
      },
      { transaction: t }
    );
  });
}

module.exports = {
  requestWithdrawal,
  listPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  processWithdrawal,
  markWithdrawalFailed,
};
