module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    full_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    mobile_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    profession_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'professions',
        key: 'id'
      }
    },
    alternate_contact: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    emergency_contact_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    emergency_contact_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    vehicle_info: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    profile_photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    must_reset_password: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    mobile_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Registration approval fields
    registration_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    registration_approved_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    registration_approved_by_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['Admin', 'President', 'Secretary', 'Treasurer']]
      }
    },
    registration_approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    registration_rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['mobile_number']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['registration_approved']
      },
      {
        fields: ['registration_approved_at']
      }
    ]
  });

  return User;
};