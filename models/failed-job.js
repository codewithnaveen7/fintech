'use strict';

module.exports = (sequelize, DataTypes) => {
  const FailedJob = sequelize.define(
    'FailedJob',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      queue_name: DataTypes.STRING,
      job_data: DataTypes.JSON,
      error_message: DataTypes.TEXT,
      attempts_made: DataTypes.INTEGER,
      status: DataTypes.STRING,
    },
    { tableName: 'failed_jobs', underscored: true, updatedAt: false }
  );

  return FailedJob;
};
