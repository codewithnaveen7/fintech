'use strict';

const { getReports } = require('../services/admin-report');

async function reports(req, res) {
  const data = await getReports();
  res.json(data);
}

module.exports = { reports };
