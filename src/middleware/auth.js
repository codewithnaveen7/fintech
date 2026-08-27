'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../../models');

async function checkLogin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'login required' });
  }

  const myToken = authHeader.slice(7);
  let tokenData;

  try {
    tokenData = jwt.verify(myToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'invalid token' });
  }

  const user = await User.findByPk(tokenData.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ message: 'invalid token' });
  }

  req.user = user;
  next();
}

module.exports = { checkLogin };
