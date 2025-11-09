module.exports = (sequelize, DataTypes) => {
  const ParkingSlot = sequelize.define('ParkingSlot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    slot_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      validate: {
        min: 1,
        max: 200
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
    assigned_to_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    vehicle_info: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    assignment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    assigned_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'parking_slots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['slot_number']
      },
      {
        fields: ['apartment_id']
      },
      {
        fields: ['assigned_to_user_id']
      }
    ],
    validate: {
      slotNumberRange() {
        if (this.slot_number < 1 || this.slot_number > 200) {
          throw new Error('Slot number must be between 1 and 200');
        }
      }
    }
  });

  return ParkingSlot;
};