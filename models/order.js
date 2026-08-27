'use strict';

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      user_id: DataTypes.CHAR(36),
      order_number: DataTypes.STRING,
      total_amount: DataTypes.DECIMAL(19, 4),
      status: DataTypes.STRING,
      idempotency_key: DataTypes.STRING,
    },
    { tableName: 'orders', underscored: true }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.User, { foreignKey: 'user_id' });
    Order.hasMany(models.OrderItem, { foreignKey: 'order_id' });
  };

  return Order;
};
