'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
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
      order_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      total_amount: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      status: {
        type: Sequelize.ENUM('CREATED', 'PAID', 'FAILED', 'CANCELLED'),
        defaultValue: 'CREATED',
      },
      idempotency_key: { type: Sequelize.STRING(255), unique: true },
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

    await queryInterface.addIndex('orders', ['user_id', 'status'], { name: 'idx_user_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  },
};
