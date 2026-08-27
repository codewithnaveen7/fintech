'use strict';

const bcrypt = require('bcryptjs');
const { createUserWithWallet } = require('../src/services/user.service');
const { User } = require('../models');

module.exports = {
  async up() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const existing = await User.findOne({ where: { email } });

    if (existing) return;

    await createUserWithWallet({
      email,
      password_hash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12),
      first_name: 'Admin',
      last_name: 'User',
      is_admin: true,
      is_active: true,
    });
  },

  async down() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    await User.destroy({ where: { email } });
  },
};
