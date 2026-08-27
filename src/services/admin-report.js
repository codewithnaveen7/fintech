'use strict';

const { sequelize, FailedJob } = require('../../models');

function moneyText(value) {
  if (value == null) return '0.0000';
  return Number(Number(value).toFixed(4)).toFixed(4);
}

async function getReports() {
  const [walletRows] = await sequelize.query(
    'SELECT COALESCE(SUM(available_balance), 0) AS available_balance, COALESCE(SUM(locked_balance), 0) AS locked_balance FROM wallets'
  );
  const wallet = walletRows[0];

  const [processedRows] = await sequelize.query(
    "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount FROM withdrawals WHERE status = 'PROCESSED'"
  );
  const processed = processedRows[0];

  const [failedRows] = await sequelize.query(
    "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount FROM withdrawals WHERE status = 'FAILED'"
  );
  const failed = failedRows[0];

  const failedJobs = await FailedJob.count();

  const [topRows] = await sequelize.query(
    'SELECT u.id AS user_id, u.email, SUM(l.debit + l.credit) AS volume, COUNT(l.id) AS transaction_count FROM ledger_entries l INNER JOIN users u ON u.id = l.user_id GROUP BY u.id, u.email ORDER BY volume DESC LIMIT 10'
  );

  const available = Number(wallet.available_balance);
  const locked = Number(wallet.locked_balance);

  return {
    total_wallet_balance: {
      available_balance: moneyText(available),
      locked_balance: moneyText(locked),
      total: moneyText(available + locked),
    },
    total_processed_withdrawals: {
      count: Number(processed.count),
      total_amount: moneyText(processed.total_amount),
    },
    failed_transactions: {
      failed_withdrawals: Number(failed.count),
      failed_withdrawal_amount: moneyText(failed.total_amount),
      failed_jobs: failedJobs,
    },
    top_users: topRows.map((row) => ({
      user_id: row.user_id,
      email: row.email,
      volume: moneyText(row.volume),
      transaction_count: Number(row.transaction_count),
    })),
  };
}

module.exports = { getReports };
