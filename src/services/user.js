'use strict';

const { randomUUID } = require('crypto');
const { sequelize, User, Wallet } = require('../../models');

async function createUser(fields) {
  return sequelize.transaction(async (t) => {
    const user = await User.create(
      { id: randomUUID(), is_admin: false, is_active: true, ...fields },
      { transaction: t }
    );

    await Wallet.create(
      {
        id: randomUUID(),
        user_id: user.id,
        available_balance: 0,
        locked_balance: 0,
      },
      { transaction: t }
    );

    return user;
  });
}

module.exports = { createUser };
