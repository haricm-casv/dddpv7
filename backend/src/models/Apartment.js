module.exports = (sequelize, DataTypes) => {
  const Apartment = sequelize.define('Apartment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    floor_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    unit_type: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    unit_number: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    square_footage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    building_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'apartments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['floor_number', 'unit_type', 'unit_number']
      },
      {
        fields: ['floor_number', 'unit_type'], // Critical ordering index
        name: 'idx_apartments_floor_type'
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Virtual field for display name
  Apartment.prototype.getDisplayName = function() {
    return `${this.floor_number} ${this.unit_type}`;
  };

  return Apartment;
};