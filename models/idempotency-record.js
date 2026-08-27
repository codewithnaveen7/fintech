'use strict';

module.exports = (sequelize, DataTypes) => {
  const IdempotencyRecord = sequelize.define(
    'IdempotencyRecord',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      idempotency_key: DataTypes.STRING,
      resource_type: DataTypes.STRING,
      resource_id: DataTypes.CHAR(36),
      response: DataTypes.JSON,
      expires_at: DataTypes.DATE,
    },
    { tableName: 'idempotency_records', underscored: true, updatedAt: false }
  );

  return IdempotencyRecord;
};
