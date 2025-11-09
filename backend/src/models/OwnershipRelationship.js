module.exports = (sequelize, DataTypes) => {
  const OwnershipRelationship = sequelize.define('OwnershipRelationship', {
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
    apartment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'apartments',
        key: 'id'
      }
    },
    ownership_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
        isIn: [['Admin', 'President', 'Secretary', 'Treasurer']]
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'ownership_relationships',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['apartment_id']
      },
      {
        fields: ['is_active']
      },
      {
        unique: true,
        fields: ['user_id', 'apartment_id'],
        where: {
          is_active: true
        },
        name: 'idx_ownership_active_user_apartment'
      }
    ],
    validate: {
      ownershipPercentageRange() {
        if (this.ownership_percentage < 0 || this.ownership_percentage > 100) {
          throw new Error('Ownership percentage must be between 0 and 100');
        }
      }
    }
  });

  return OwnershipRelationship;
};