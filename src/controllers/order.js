'use strict';

const { Order, OrderItem, Product } = require('../../models');
const { createOrder } = require('../services/order');

async function create(req, res) {
  const items = req.body.items;
  const idempotencyKey = (req.headers['idempotency-key'] || '').trim();

  if (!idempotencyKey) {
    return res.status(400).json({ message: 'Idempotency-Key header is required' });
  }

  if (items?.length === 0) {
    return res.status(400).json({ message: 'items are required' });
  }

  const result = await createOrder(req.user.id, items, idempotencyKey);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }

  res.status(result.created ? 201 : 200).json(result.data);
}

async function getOrder(req, res) {
  const order = await Order.findOne({
    where: { id: req.params.id, user_id: req.user.id },
    include: [
      {
        model: OrderItem,
        include: [{ model: Product, attributes: ['name'] }],
      },
    ],
  });

  if (!order) {
    return res.status(404).json({ message: 'order not found' });
  }

  res.json({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    created_at: order.createdAt,
    items: order.OrderItems.map((row) => ({
      product_id: row.product_id,
      name: row.Product ? row.Product.name : null,
      quantity: row.quantity,
      price: row.price,
      total: row.total,
    })),
  });
}

module.exports = { create, getOrder };
