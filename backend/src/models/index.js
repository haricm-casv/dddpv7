const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Import all models
const Role = require('./Role')(sequelize, DataTypes);
const Profession = require('./Profession')(sequelize, DataTypes);
const Apartment = require('./Apartment')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const UserRole = require('./UserRole')(sequelize, DataTypes);
const OwnershipRelationship = require('./OwnershipRelationship')(sequelize, DataTypes);
const TenantRelationship = require('./TenantRelationship')(sequelize, DataTypes);
const OwnershipTransfer = require('./OwnershipTransfer')(sequelize, DataTypes);
const ParkingSlot = require('./ParkingSlot')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);
const PstCommitteeAction = require('./PstCommitteeAction')(sequelize, DataTypes);
const AuditLog = require('./AuditLog')(sequelize, DataTypes);

// Define associations
// Role associations
Role.hasMany(UserRole, { foreignKey: 'role_id', onDelete: 'CASCADE' });

// Profession associations
Profession.hasMany(User, { foreignKey: 'profession_id' });

// Apartment associations
Apartment.hasMany(UserRole, { foreignKey: 'apartment_id' });
Apartment.hasMany(OwnershipRelationship, { foreignKey: 'apartment_id', onDelete: 'CASCADE' });
Apartment.hasMany(TenantRelationship, { foreignKey: 'apartment_id', onDelete: 'CASCADE' });
Apartment.hasMany(OwnershipTransfer, { foreignKey: 'apartment_id' });
Apartment.hasMany(ParkingSlot, { foreignKey: 'apartment_id' });

// User associations
User.hasMany(UserRole, { foreignKey: 'user_id', onDelete: 'CASCADE' });
User.hasMany(OwnershipRelationship, { foreignKey: 'user_id', onDelete: 'CASCADE' });
User.hasMany(TenantRelationship, { foreignKey: 'user_id', onDelete: 'CASCADE' });
User.hasMany(OwnershipTransfer, { foreignKey: 'from_user_id' });
User.hasMany(OwnershipTransfer, { foreignKey: 'to_user_id' });
User.hasMany(OwnershipTransfer, { foreignKey: 'approved_by_user_id' });
User.hasMany(OwnershipRelationship, { foreignKey: 'approved_by_user_id' });
User.hasMany(TenantRelationship, { foreignKey: 'approved_by_user_id' });
User.hasMany(ParkingSlot, { foreignKey: 'assigned_to_user_id' });
User.hasMany(ParkingSlot, { foreignKey: 'assigned_by_user_id' });
User.hasMany(Notification, { foreignKey: 'user_id', onDelete: 'CASCADE' });
User.hasMany(Notification, { foreignKey: 'sent_by_user_id' });
User.hasMany(PstCommitteeAction, { foreignKey: 'pst_member_user_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });
User.hasMany(UserRole, { foreignKey: 'assigned_by_user_id' });

// UserRole associations
UserRole.belongsTo(Role, { foreignKey: 'role_id' });
UserRole.belongsTo(Apartment, { foreignKey: 'apartment_id' });
UserRole.belongsTo(User, { foreignKey: 'user_id' });
UserRole.belongsTo(User, { foreignKey: 'assigned_by_user_id', as: 'assignedBy' });

// OwnershipRelationship associations
OwnershipRelationship.belongsTo(User, { foreignKey: 'user_id' });
OwnershipRelationship.belongsTo(Apartment, { foreignKey: 'apartment_id' });
OwnershipRelationship.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approvedBy' });

// TenantRelationship associations
TenantRelationship.belongsTo(User, { foreignKey: 'user_id' });
TenantRelationship.belongsTo(Apartment, { foreignKey: 'apartment_id' });
TenantRelationship.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approvedBy' });

// OwnershipTransfer associations
OwnershipTransfer.belongsTo(Apartment, { foreignKey: 'apartment_id' });
OwnershipTransfer.belongsTo(User, { foreignKey: 'from_user_id', as: 'fromUser' });
OwnershipTransfer.belongsTo(User, { foreignKey: 'to_user_id', as: 'toUser' });
OwnershipTransfer.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approvedBy' });

// ParkingSlot associations
ParkingSlot.belongsTo(Apartment, { foreignKey: 'apartment_id' });
ParkingSlot.belongsTo(User, { foreignKey: 'assigned_to_user_id', as: 'assignedToUser' });
ParkingSlot.belongsTo(User, { foreignKey: 'assigned_by_user_id', as: 'assignedByUser' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'sent_by_user_id', as: 'sentBy' });

// PstCommitteeAction associations
PstCommitteeAction.belongsTo(User, { foreignKey: 'pst_member_user_id', as: 'pstMember' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

// Export all models
module.exports = {
  sequelize,
  Sequelize,
  Role,
  Profession,
  Apartment,
  User,
  UserRole,
  OwnershipRelationship,
  TenantRelationship,
  OwnershipTransfer,
  ParkingSlot,
  Notification,
  PstCommitteeAction,
  AuditLog
};