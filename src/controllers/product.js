'use strict';

const { randomUUID } = require('crypto');
const { Product } = require('../../models');

async function addProduct(req, res) {
  const name = (req.body.name || '').trim();
  const price = req.body.price;
  const inventoryQuantity = req.body.inventory_quantity;

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  if (price == null || Number(price) <= 0 || Number.isNaN(Number(price))) {
    return res.status(400).json({ message: 'price must be greater than 0' });
  }

  if (
    inventoryQuantity == null ||
    !Number.isInteger(Number(inventoryQuantity)) ||
    Number(inventoryQuantity) < 0
  ) {
    return res.status(400).json({ message: 'inventory_quantity must be 0 or more' });
  }

  const product = await Product.create({
    id: randomUUID(),
    name,
    price: Number(Number(price).toFixed(4)).toFixed(4),
    inventory_quantity: Number(inventoryQuantity),
    version: 1,
  });

  res.status(201).json({
    id: product.id,
    name: product.name,
    price: product.price,
    inventory_quantity: product.inventory_quantity,
  });
}

async function listProducts(req, res) {
  const products = await Product.findAll({
    order: [['createdAt', 'DESC']],
  });

  const list = products.map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    inventory_quantity: row.inventory_quantity,
  }));

  res.json({ products: list });
}

module.exports = { addProduct, listProducts };
