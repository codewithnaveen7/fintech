'use strict';

module.exports = (sequelize, DataTypes) => {
  const Withdrawal = sequelize.define(
    'Withdrawal',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      user_id: DataTypes.CHAR(36),
      withdrawal_reference: DataTypes.STRING,
      amount: DataTypes.DECIMAL(19, 4),
      status: DataTypes.STRING,
      idempotency_key: DataTypes.STRING,
      retry_count: DataTypes.INTEGER,
      failure_reason: DataTypes.TEXT,
      processed_at: DataTypes.DATE,
    },
    { tableName: 'withdrawals', underscored: true }
  );

  Withdrawal.associate = (models) => {
    Withdrawal.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return Withdrawal;
};
