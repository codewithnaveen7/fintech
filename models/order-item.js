'use strict';

module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      order_id: DataTypes.CHAR(36),
      product_id: DataTypes.CHAR(36),
      quantity: DataTypes.INTEGER,
      price: DataTypes.DECIMAL(19, 4),
      total: DataTypes.DECIMAL(19, 4),
    },
    { tableName: 'order_items', underscored: true, updatedAt: false }
  );

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: 'order_id' });
    OrderItem.belongsTo(models.Product, { foreignKey: 'product_id' });
  };

  return OrderItem;
};
