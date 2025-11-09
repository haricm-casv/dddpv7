module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM('INSERT', 'UPDATE', 'DELETE'),
      allowNull: false
    },
    table_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    record_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    old_value: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    new_value: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    user_role: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updated_at for audit logs
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['table_name', 'record_id']
      },
      {
        fields: ['created_at'],
        order: 'DESC'
      }
    ],
    validate: {
      actionValid() {
        const validActions = ['INSERT', 'UPDATE', 'DELETE'];
        if (!validActions.includes(this.action)) {
          throw new Error('Invalid action type');
        }
      }
    }
  });

  return AuditLog;
};