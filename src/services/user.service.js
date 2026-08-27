'use strict';

const { randomUUID } = require('crypto');
const { sequelize, User, Wallet } = require('../models');

async function createUserWithWallet(data, outerTransaction) {
  const run = async (transaction) => {
    const user = await User.create(
      {
        id: randomUUID(),
        ...data,
      },
      { transaction }
    );

    await Wallet.create(
      {
        id: randomUUID(),
        user_id: user.id,
        available_balance: 0,
        locked_balance: 0,
      },
      { transaction }
    );

    return user;
  };

  if (outerTransaction) {
    return run(outerTransaction);
  }

  return sequelize.transaction(run);
}

module.exports = { createUserWithWallet };
