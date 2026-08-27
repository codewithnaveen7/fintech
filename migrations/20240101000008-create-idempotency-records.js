'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('idempotency_records', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())'),
      },
      idempotency_key: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      resource_type: { type: Sequelize.STRING(50), allowNull: false },
      resource_id: Sequelize.CHAR(36),
      response: Sequelize.JSON,
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('idempotency_records', ['expires_at'], {
      name: 'idx_expires_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('idempotency_records');
  },
};
