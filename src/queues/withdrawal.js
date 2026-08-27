'use strict';

const Queue = require('bull');

const withdrawalQueue = new Queue('withdrawals', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
  },
});

module.exports = { withdrawalQueue };
