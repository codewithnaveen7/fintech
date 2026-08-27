'use strict';

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      name: DataTypes.STRING,
      price: DataTypes.DECIMAL(19, 4),
      inventory_quantity: DataTypes.INTEGER,
      version: DataTypes.INTEGER,
    },
    { tableName: 'products', underscored: true }
  );

  Product.associate = (models) => {
    Product.hasMany(models.OrderItem, { foreignKey: 'product_id' });
  };

  return Product;
};
