module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
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
    notification_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    link_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      allowNull: false
    },
    sent_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sent_by_role: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updated_at for notifications
    indexes: [
      {
        fields: ['user_id', 'is_read']
      },
      {
        fields: ['notification_type']
      },
      {
        fields: ['created_at'],
        order: 'DESC'
      },
      {
        fields: ['priority']
      }
    ],
    validate: {
      priorityValid() {
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (!validPriorities.includes(this.priority)) {
          throw new Error('Invalid priority value');
        }
      }
    }
  });

  return Notification;
};