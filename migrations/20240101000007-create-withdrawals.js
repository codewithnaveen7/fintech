'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('withdrawals', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())'),
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      withdrawal_reference: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      amount: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'REJECTED'),
        defaultValue: 'PENDING',
      },
      idempotency_key: { type: Sequelize.STRING(255), unique: true },
      retry_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      failure_reason: Sequelize.TEXT,
      processed_at: Sequelize.DATE,
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('withdrawals', ['user_id', 'status'], {
      name: 'idx_withdrawal_user_status',
    });
    await queryInterface.addIndex('withdrawals', ['status', 'created_at'], {
      name: 'idx_status_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('withdrawals');
  },
};
