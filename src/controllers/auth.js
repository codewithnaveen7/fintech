'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const { createUser } = require('../services/user');

function getUserInfo(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    is_admin: user.is_admin,
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res) {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || password.length < 8 || !first_name || !last_name) {
    return res.status(400).json({
      message: 'email, first_name, last_name and a password of at least 8 characters are required',
    });
  }

  const emailId = email.toLowerCase().trim();
  const alreadyThere = await User.findOne({ where: { email: emailId } });
  if (alreadyThere) {
    return res.status(409).json({ message: 'email already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({
    email: emailId,
    password_hash: passwordHash,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
  });

  const myToken = createToken(user);
  res.status(201).json({ token: myToken, user: getUserInfo(user) });
}

async function login(req, res) {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await User.findOne({ where: { email } });
  if (!user || !user.is_active) {
    return res.status(401).json({ message: 'wrong email or password' });
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: 'wrong email or password' });
  }

  user.last_login_at = new Date();
  await user.save();

  const myToken = createToken(user);
  res.json({ token: myToken, user: getUserInfo(user) });
}

function me(req, res) {
  res.json({ user: getUserInfo(req.user) });
}

module.exports = { register, login, me };
