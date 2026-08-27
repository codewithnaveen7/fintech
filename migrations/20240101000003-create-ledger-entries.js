'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ledger_entries', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())'),
      },
      transaction_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      wallet_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'wallets', key: 'id' },
        onDelete: 'CASCADE',
      },
      transaction_type: {
        type: Sequelize.ENUM(
          'WALLET_TOPUP',
          'ORDER_PAYMENT',
          'WITHDRAWAL_REQUEST',
          'WITHDRAWAL_PROCESSED',
          'WITHDRAWAL_REVERSED',
          'REFUND'
        ),
        allowNull: false,
      },
      debit: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      credit: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      opening_balance: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      closing_balance: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      reference_type: Sequelize.STRING(50),
      reference_id: Sequelize.CHAR(36),
      metadata: Sequelize.JSON,
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ledger_entries', ['user_id', 'created_at'], {
      name: 'idx_user_created',
    });
    await queryInterface.addIndex('ledger_entries', ['reference_type', 'reference_id'], {
      name: 'idx_reference',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ledger_entries');
  },
};
