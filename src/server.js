'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('../models');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
const withdrawalRoutes = require('./routes/withdrawal');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/withdrawals', withdrawalRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(req.method, req.originalUrl, err.message);
  res.status(500).json({ message: 'something went wrong' });
});

sequelize.authenticate().then(() => {
  app.listen(port, () => {
    console.log('listening on', port);
  });
});
