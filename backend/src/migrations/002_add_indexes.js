'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Roles indexes
    await queryInterface.addIndex('roles', ['role_name'], {
      unique: true,
      name: 'idx_roles_name'
    });
    await queryInterface.addIndex('roles', ['permission_level'], {
      name: 'idx_roles_permission_level'
    });

    // Professions indexes
    await queryInterface.addIndex('professions', ['name'], {
      unique: true,
      name: 'idx_professions_name'
    });
    await queryInterface.addIndex('professions', ['is_active'], {
      name: 'idx_professions_active'
    });

    // Apartments indexes - Critical ordering index
    await queryInterface.addIndex('apartments', ['floor_number', 'unit_type'], {
      name: 'idx_apartments_floor_type'
    });
    await queryInterface.addIndex('apartments', ['is_active'], {
      name: 'idx_apartments_active'
    });
    // Unique constraint for apartment ordering
    await queryInterface.addIndex('apartments', ['floor_number', 'unit_type', 'unit_number'], {
      unique: true,
      name: 'idx_apartments_unique'
    });

    // Users indexes
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'idx_users_email'
    });
    await queryInterface.addIndex('users', ['mobile_number'], {
      unique: true,
      name: 'idx_users_mobile'
    });
    await queryInterface.addIndex('users', ['is_active'], {
      name: 'idx_users_active'
    });
    await queryInterface.addIndex('users', ['created_at'], {
      name: 'idx_users_created_at'
    });

    // User roles indexes
    await queryInterface.addIndex('user_roles', ['user_id'], {
      name: 'idx_user_roles_user'
    });
    await queryInterface.addIndex('user_roles', ['role_id'], {
      name: 'idx_user_roles_role'
    });
    await queryInterface.addIndex('user_roles', ['apartment_id'], {
      name: 'idx_user_roles_apartment'
    });
    await queryInterface.addIndex('user_roles', ['is_active'], {
      name: 'idx_user_roles_active'
    });
    await queryInterface.addIndex('user_roles', ['user_id', 'apartment_id'], {
      name: 'idx_user_roles_user_apartment'
    });
    // Unique constraint for active role assignments
    await queryInterface.addIndex('user_roles', ['user_id', 'role_id', 'apartment_id', 'is_active'], {
      unique: true,
      name: 'idx_user_roles_unique_active',
      where: {
        is_active: true
      }
    });

    // Ownership relationships indexes
    await queryInterface.addIndex('ownership_relationships', ['user_id'], {
      name: 'idx_ownership_user'
    });
    await queryInterface.addIndex('ownership_relationships', ['apartment_id'], {
      name: 'idx_ownership_apartment'
    });
    await queryInterface.addIndex('ownership_relationships', ['is_active'], {
      name: 'idx_ownership_active'
    });
    // Unique constraint for active ownership
    await queryInterface.addIndex('ownership_relationships', ['user_id', 'apartment_id'], {
      unique: true,
      name: 'idx_ownership_active_user_apartment',
      where: {
        is_active: true
      }
    });

    // Tenant relationships indexes
    await queryInterface.addIndex('tenant_relationships', ['user_id'], {
      name: 'idx_tenant_user'
    });
    await queryInterface.addIndex('tenant_relationships', ['apartment_id'], {
      name: 'idx_tenant_apartment'
    });
    await queryInterface.addIndex('tenant_relationships', ['is_active'], {
      name: 'idx_tenant_active'
    });
    await queryInterface.addIndex('tenant_relationships', ['lease_end_date'], {
      name: 'idx_tenant_lease_end'
    });
    // Unique constraint for active tenancy
    await queryInterface.addIndex('tenant_relationships', ['user_id', 'apartment_id'], {
      unique: true,
      name: 'idx_tenant_active_user_apartment',
      where: {
        is_active: true
      }
    });

    // Ownership transfers indexes
    await queryInterface.addIndex('ownership_transfers', ['status'], {
      name: 'idx_transfers_status'
    });
    await queryInterface.addIndex('ownership_transfers', ['apartment_id'], {
      name: 'idx_transfers_apartment'
    });
    await queryInterface.addIndex('ownership_transfers', ['from_user_id'], {
      name: 'idx_transfers_from_user'
    });
    await queryInterface.addIndex('ownership_transfers', ['to_user_id'], {
      name: 'idx_transfers_to_user'
    });
    await queryInterface.addIndex('ownership_transfers', ['request_date'], {
      name: 'idx_transfers_request_date',
      order: 'DESC'
    });

    // Parking slots indexes
    await queryInterface.addIndex('parking_slots', ['slot_number'], {
      unique: true,
      name: 'idx_parking_slot_number'
    });
    await queryInterface.addIndex('parking_slots', ['apartment_id'], {
      name: 'idx_parking_apartment'
    });
    await queryInterface.addIndex('parking_slots', ['assigned_to_user_id'], {
      name: 'idx_parking_assigned_user'
    });

    // Notifications indexes
    await queryInterface.addIndex('notifications', ['user_id', 'is_read'], {
      name: 'idx_notifications_user_read'
    });
    await queryInterface.addIndex('notifications', ['notification_type'], {
      name: 'idx_notifications_type'
    });
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'idx_notifications_created',
      order: 'DESC'
    });
    await queryInterface.addIndex('notifications', ['priority'], {
      name: 'idx_notifications_priority'
    });

    // PST committee actions indexes
    await queryInterface.addIndex('pst_committee_actions', ['pst_member_user_id'], {
      name: 'idx_pst_actions_member'
    });
    await queryInterface.addIndex('pst_committee_actions', ['action_type'], {
      name: 'idx_pst_actions_type'
    });
    await queryInterface.addIndex('pst_committee_actions', ['created_at'], {
      name: 'idx_pst_actions_created',
      order: 'DESC'
    });

    // Audit logs indexes
    await queryInterface.addIndex('audit_logs', ['user_id'], {
      name: 'idx_audit_user'
    });
    await queryInterface.addIndex('audit_logs', ['table_name', 'record_id'], {
      name: 'idx_audit_table_record'
    });
    await queryInterface.addIndex('audit_logs', ['created_at'], {
      name: 'idx_audit_created',
      order: 'DESC'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all indexes in reverse order
    const indexes = [
      'idx_audit_created',
      'idx_audit_table_record',
      'idx_audit_user',
      'idx_pst_actions_created',
      'idx_pst_actions_type',
      'idx_pst_actions_member',
      'idx_notifications_priority',
      'idx_notifications_created',
      'idx_notifications_type',
      'idx_notifications_user_read',
      'idx_parking_assigned_user',
      'idx_parking_apartment',
      'idx_parking_slot_number',
      'idx_transfers_request_date',
      'idx_transfers_to_user',
      'idx_transfers_from_user',
      'idx_transfers_apartment',
      'idx_transfers_status',
      'idx_tenant_active_user_apartment',
      'idx_tenant_lease_end',
      'idx_tenant_active',
      'idx_tenant_apartment',
      'idx_tenant_user',
      'idx_ownership_active_user_apartment',
      'idx_ownership_active',
      'idx_ownership_apartment',
      'idx_ownership_user',
      'idx_user_roles_unique_active',
      'idx_user_roles_user_apartment',
      'idx_user_roles_active',
      'idx_user_roles_apartment',
      'idx_user_roles_role',
      'idx_user_roles_user',
      'idx_users_created_at',
      'idx_users_active',
      'idx_users_mobile',
      'idx_users_email',
      'idx_apartments_unique',
      'idx_apartments_active',
      'idx_apartments_floor_type',
      'idx_professions_active',
      'idx_professions_name',
      'idx_roles_permission_level',
      'idx_roles_name'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex(null, indexName);
      } catch (error) {
        console.log(`Index ${indexName} may not exist, skipping...`);
      }
    }
  }
};