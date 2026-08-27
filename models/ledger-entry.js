'use strict';

module.exports = (sequelize, DataTypes) => {
  const LedgerEntry = sequelize.define(
    'LedgerEntry',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      transaction_id: DataTypes.STRING,
      user_id: DataTypes.CHAR(36),
      wallet_id: DataTypes.CHAR(36),
      transaction_type: DataTypes.STRING,
      debit: DataTypes.DECIMAL(19, 4),
      credit: DataTypes.DECIMAL(19, 4),
      opening_balance: DataTypes.DECIMAL(19, 4),
      closing_balance: DataTypes.DECIMAL(19, 4),
      reference_type: DataTypes.STRING,
      reference_id: DataTypes.CHAR(36),
      metadata: DataTypes.JSON,
    },
    { tableName: 'ledger_entries', underscored: true, updatedAt: false }
  );

  LedgerEntry.associate = (models) => {
    LedgerEntry.belongsTo(models.User, { foreignKey: 'user_id' });
    LedgerEntry.belongsTo(models.Wallet, { foreignKey: 'wallet_id' });
  };

  return LedgerEntry;
};
