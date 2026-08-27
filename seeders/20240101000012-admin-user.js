'use strict';

const bcrypt = require('bcryptjs');
const { createUser } = require('../src/services/user');
const { User } = require('../models');

module.exports = {
  async up() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const exists = await User.findOne({ where: { email } });
    if (exists) return;

    await createUser({
      email,
      password_hash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12),
      first_name: 'Admin',
      last_name: 'User',
      is_admin: true,
    });
  },

  async down() {
    await User.destroy({
      where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' },
    });
  },
};
