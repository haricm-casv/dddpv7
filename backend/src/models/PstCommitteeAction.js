module.exports = (sequelize, DataTypes) => {
  const PstCommitteeAction = sequelize.define('PstCommitteeAction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pst_member_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    pst_role: {
      type: DataTypes.ENUM('President', 'Secretary', 'Treasurer'),
      allowNull: false
    },
    action_type: {
      type: DataTypes.ENUM('approval', 'rejection', 'override', 'modification'),
      allowNull: false
    },
    target_table: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    target_record_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    action_details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'pst_committee_actions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updated_at for audit-like records
    indexes: [
      {
        fields: ['pst_member_user_id']
      },
      {
        fields: ['action_type']
      },
      {
        fields: ['created_at'],
        order: 'DESC'
      }
    ],
    validate: {
      pstRoleValid() {
        const validRoles = ['President', 'Secretary', 'Treasurer'];
        if (!validRoles.includes(this.pst_role)) {
          throw new Error('Invalid PST role');
        }
      },
      actionTypeValid() {
        const validActions = ['approval', 'rejection', 'override', 'modification'];
        if (!validActions.includes(this.action_type)) {
          throw new Error('Invalid action type');
        }
      }
    }
  });

  return PstCommitteeAction;
};