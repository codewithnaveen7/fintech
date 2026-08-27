'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      email: DataTypes.STRING,
      password_hash: DataTypes.STRING,
      first_name: DataTypes.STRING,
      last_name: DataTypes.STRING,
      is_admin: DataTypes.BOOLEAN,
      is_active: DataTypes.BOOLEAN,
      last_login_at: DataTypes.DATE,
    },
    { tableName: 'users', underscored: true }
  );

  User.associate = (models) => {
    User.hasOne(models.Wallet, { foreignKey: 'user_id' });
    User.hasMany(models.Order, { foreignKey: 'user_id' });
    User.hasMany(models.Withdrawal, { foreignKey: 'user_id' });
    User.hasMany(models.LedgerEntry, { foreignKey: 'user_id' });
  };

  return User;
};
