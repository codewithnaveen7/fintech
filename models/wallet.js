'use strict';

module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define(
    'Wallet',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      user_id: DataTypes.CHAR(36),
      available_balance: DataTypes.DECIMAL(19, 4),
      locked_balance: DataTypes.DECIMAL(19, 4),
      version: DataTypes.INTEGER,
    },
    { tableName: 'wallets', underscored: true }
  );

  Wallet.associate = (models) => {
    Wallet.belongsTo(models.User, { foreignKey: 'user_id' });
    Wallet.hasMany(models.LedgerEntry, { foreignKey: 'wallet_id' });
  };

  return Wallet;
};
