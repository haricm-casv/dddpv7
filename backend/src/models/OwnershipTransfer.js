module.exports = (sequelize, DataTypes) => {
  const OwnershipTransfer = sequelize.define('OwnershipTransfer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    apartment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'apartments',
        key: 'id'
      }
    },
    from_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    to_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    ownership_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0.01,
        max: 100
      }
    },
    request_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    approved_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_by_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['President', 'Secretary', 'Treasurer']]
      }
    },
    approval_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transfer_completion_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'ownership_transfers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['apartment_id']
      },
      {
        fields: ['from_user_id']
      },
      {
        fields: ['to_user_id']
      },
      {
        fields: ['request_date'],
        order: 'DESC'
      }
    ],
    validate: {
      differentUsers() {
        if (this.from_user_id === this.to_user_id) {
          throw new Error('From and to users cannot be the same');
        }
      },
      ownershipPercentageRange() {
        if (this.ownership_percentage <= 0 || this.ownership_percentage > 100) {
          throw new Error('Ownership percentage must be between 0.01 and 100');
        }
      }
    }
  });

  return OwnershipTransfer;
};