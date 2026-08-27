'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP TRIGGER IF EXISTS create_wallet_after_user_insert'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TRIGGER create_wallet_after_user_insert
      AFTER INSERT ON users
      FOR EACH ROW
      INSERT INTO wallets (id, user_id, available_balance, locked_balance)
      VALUES (UUID(), NEW.id, 0, 0)
    `);
  },
};
