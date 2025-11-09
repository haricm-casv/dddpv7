module.exports = (sequelize, DataTypes) => {
  const TenantRelationship = sequelize.define('TenantRelationship', {
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
    lease_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    lease_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    is_auto_renew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    },
    modified_by_pst: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'tenant_relationships',
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
        fields: ['lease_end_date']
      },
      {
        unique: true,
        fields: ['user_id', 'apartment_id'],
        where: {
          is_active: true
        },
        name: 'idx_tenant_active_user_apartment'
      }
    ],
    validate: {
      leaseDateOrder() {
        if (this.lease_start_date && this.lease_end_date && this.lease_start_date >= this.lease_end_date) {
          throw new Error('Lease end date must be after start date');
        }
      }
    }
  });

  return TenantRelationship;
};