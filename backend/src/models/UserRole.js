module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
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
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    apartment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'apartments',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    assigned_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    deactivated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'user_roles',
    timestamps: false, // Custom timestamps
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['role_id']
      },
      {
        fields: ['apartment_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['user_id', 'apartment_id']
      },
      {
        unique: true,
        fields: ['user_id', 'role_id', 'apartment_id', 'is_active'],
        where: {
          is_active: true
        }
      }
    ]
  });

  return UserRole;
};