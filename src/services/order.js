'use strict';

const { randomUUID } = require('crypto');
const { sequelize, Wallet, Product, Order, OrderItem, LedgerEntry, IdempotencyRecord } = require('../../models');

function toMoney(value) {
  return Number(Number(value).toFixed(4));
}

function moneyText(value) {
  return toMoney(value).toFixed(4);
}

function mergeItems(items) {
  const qtyByProduct = {};
  for (const row of items) {
    qtyByProduct[row.product_id] = (qtyByProduct[row.product_id] || 0) + Number(row.quantity);
  }
  return Object.keys(qtyByProduct)
    .sort()
    .map((productId) => ({ product_id: productId, quantity: qtyByProduct[productId] }));
}

async function createOrder(userId, items, idempotencyKey) {
  const storedKey = userId + ':ORDER:' + idempotencyKey;
  const mergedItems = mergeItems(items);

  return sequelize.transaction(async (t) => {
    const wallet = await Wallet.findOne({
      where: { user_id: userId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!wallet) {
      return { ok: false, status: 404, message: 'wallet not found' };
    }

    const alreadyThere = await IdempotencyRecord.findOne({
      where: { idempotency_key: storedKey },
      transaction: t,
    });

    if (alreadyThere) {
      if (JSON.stringify(alreadyThere.response.requestItems) !== JSON.stringify(mergedItems)) {
        return { ok: false, status: 409, message: 'idempotency key already used' };
      }
      return { ok: true, created: false, data: alreadyThere.response.order };
    }

    const lockedProducts = [];
    for (const row of mergedItems) {
      const product = await Product.findOne({
        where: { id: row.product_id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!product) {
        return { ok: false, status: 404, message: 'product not found' };
      }
      if (product.inventory_quantity < row.quantity) {
        return { ok: false, status: 400, message: 'not enough stock for ' + product.name };
      }
      lockedProducts.push({ product, quantity: row.quantity });
    }

    let totalAmount = 0;
    const orderLines = lockedProducts.map(({ product, quantity }) => {
      const price = toMoney(product.price);
      const lineTotal = toMoney(price * quantity);
      totalAmount = toMoney(totalAmount + lineTotal);
      return { product, quantity, price, lineTotal };
    });

    const openingBalance = toMoney(wallet.available_balance);
    if (openingBalance < totalAmount) {
      return { ok: false, status: 400, message: 'insufficient balance' };
    }

    const closingBalance = toMoney(openingBalance - totalAmount);
    const orderId = randomUUID();
    const orderNumber = 'ORD-' + randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

    await Order.create(
      {
        id: orderId,
        user_id: userId,
        order_number: orderNumber,
        total_amount: moneyText(totalAmount),
        status: 'PAID',
        idempotency_key: storedKey,
      },
      { transaction: t }
    );

    const itemPayload = [];
    for (const line of orderLines) {
      await OrderItem.create(
        {
          id: randomUUID(),
          order_id: orderId,
          product_id: line.product.id,
          quantity: line.quantity,
          price: moneyText(line.price),
          total: moneyText(line.lineTotal),
        },
        { transaction: t }
      );

      line.product.inventory_quantity -= line.quantity;
      line.product.version = (line.product.version || 1) + 1;
      await line.product.save({ transaction: t });

      itemPayload.push({
        product_id: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        price: moneyText(line.price),
        total: moneyText(line.lineTotal),
      });
    }

    wallet.available_balance = moneyText(closingBalance);
    wallet.version = (wallet.version || 1) + 1;
    await wallet.save({ transaction: t });

    await LedgerEntry.create(
      {
        id: randomUUID(),
        transaction_id: randomUUID(),
        user_id: userId,
        wallet_id: wallet.id,
        transaction_type: 'ORDER_PAYMENT',
        debit: moneyText(totalAmount),
        credit: moneyText(0),
        opening_balance: moneyText(openingBalance),
        closing_balance: moneyText(closingBalance),
        reference_type: 'ORDER',
        reference_id: orderId,
        metadata: { source: 'create_order', order_number: orderNumber },
      },
      { transaction: t }
    );

    const orderPayload = {
      id: orderId,
      order_number: orderNumber,
      status: 'PAID',
      total_amount: moneyText(totalAmount),
      items: itemPayload,
      available_balance: moneyText(closingBalance),
    };

    await IdempotencyRecord.create(
      {
        id: randomUUID(),
        idempotency_key: storedKey,
        resource_type: 'ORDER',
        resource_id: orderId,
        response: { requestItems: mergedItems, order: orderPayload },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { transaction: t }
    );

    return { ok: true, created: true, data: orderPayload };
  });
}

module.exports = { createOrder };
