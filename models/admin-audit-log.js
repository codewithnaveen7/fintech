'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdminAuditLog = sequelize.define(
    'AdminAuditLog',
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      admin_id: DataTypes.CHAR(36),
      action: DataTypes.STRING,
      resource: DataTypes.STRING,
      resource_id: DataTypes.CHAR(36),
      old_values: DataTypes.JSON,
      new_values: DataTypes.JSON,
    },
    { tableName: 'admin_audit_logs', underscored: true, updatedAt: false }
  );

  AdminAuditLog.associate = (models) => {
    AdminAuditLog.belongsTo(models.User, { foreignKey: 'admin_id' });
  };

  return AdminAuditLog;
};
