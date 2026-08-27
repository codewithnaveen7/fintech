'use strict';

require('dotenv').config();

const { randomUUID } = require('crypto');
const { sequelize, FailedJob } = require('../models');
const { withdrawalQueue } = require('./queues/withdrawal');
const { processWithdrawal, markWithdrawalFailed } = require('./services/withdrawal');

withdrawalQueue.process('process', 1, async (job) => {
  console.log('processing withdrawal', job.data.withdrawalId);
  await processWithdrawal(job.data.withdrawalId);
  console.log('processed withdrawal', job.data.withdrawalId);
});

withdrawalQueue.on('failed', async (job, err) => {
  console.error('withdrawal job failed', job.data.withdrawalId, err.message);
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    await markWithdrawalFailed(job.data.withdrawalId, err.message);
    await FailedJob.create({
      id: randomUUID(),
      queue_name: 'withdrawals',
      job_data: job.data,
      error_message: err.message,
      attempts_made: job.attemptsMade,
      status: 'PENDING',
    });
  }
});

sequelize.authenticate().then(() => {
  console.log('withdrawal worker ready');
});
