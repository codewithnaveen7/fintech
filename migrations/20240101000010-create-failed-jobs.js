'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('failed_jobs', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())'),
      },
      queue_name: { type: Sequelize.STRING(100), allowNull: false },
      job_data: { type: Sequelize.JSON, allowNull: false },
      error_message: Sequelize.TEXT,
      attempts_made: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('PENDING', 'RESOLVED', 'IGNORED'),
        defaultValue: 'PENDING',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('failed_jobs');
  },
};
