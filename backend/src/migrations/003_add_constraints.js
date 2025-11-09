'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add CHECK constraints for ownership_relationships
    await queryInterface.addConstraint('ownership_relationships', {
      fields: ['ownership_percentage'],
      type: 'check',
      name: 'chk_ownership_percentage_range',
      where: {
        ownership_percentage: {
          [Sequelize.Op.between]: [0, 100]
        }
      }
    });

    // Add CHECK constraints for tenant_relationships
    await queryInterface.addConstraint('tenant_relationships', {
      fields: ['lease_start_date', 'lease_end_date'],
      type: 'check',
      name: 'chk_lease_dates_order',
      where: {
        lease_end_date: {
          [Sequelize.Op.gt]: Sequelize.col('lease_start_date')
        }
      }
    });

    // Add CHECK constraints for ownership_transfers
    await queryInterface.addConstraint('ownership_transfers', {
      fields: ['ownership_percentage'],
      type: 'check',
      name: 'chk_transfer_percentage_range',
      where: {
        ownership_percentage: {
          [Sequelize.Op.between]: [0.01, 100]
        }
      }
    });

    await queryInterface.addConstraint('ownership_transfers', {
      fields: ['from_user_id', 'to_user_id'],
      type: 'check',
      name: 'chk_transfer_different_users',
      where: {
        from_user_id: {
          [Sequelize.Op.ne]: Sequelize.col('to_user_id')
        }
      }
    });

    await queryInterface.addConstraint('ownership_transfers', {
      fields: ['status'],
      type: 'check',
      name: 'chk_transfer_status_valid',
      where: {
        status: {
          [Sequelize.Op.in]: ['pending', 'approved', 'rejected']
        }
      }
    });

    // Add CHECK constraints for parking_slots
    await queryInterface.addConstraint('parking_slots', {
      fields: ['slot_number'],
      type: 'check',
      name: 'chk_slot_number_range',
      where: {
        slot_number: {
          [Sequelize.Op.between]: [1, 200]
        }
      }
    });

    // Add CHECK constraints for notifications
    await queryInterface.addConstraint('notifications', {
      fields: ['priority'],
      type: 'check',
      name: 'chk_notification_priority_valid',
      where: {
        priority: {
          [Sequelize.Op.in]: ['low', 'medium', 'high', 'critical']
        }
      }
    });

    // Add CHECK constraints for pst_committee_actions
    await queryInterface.addConstraint('pst_committee_actions', {
      fields: ['pst_role'],
      type: 'check',
      name: 'chk_pst_role_valid',
      where: {
        pst_role: {
          [Sequelize.Op.in]: ['President', 'Secretary', 'Treasurer']
        }
      }
    });

    await queryInterface.addConstraint('pst_committee_actions', {
      fields: ['action_type'],
      type: 'check',
      name: 'chk_action_type_valid',
      where: {
        action_type: {
          [Sequelize.Op.in]: ['approval', 'rejection', 'override', 'modification']
        }
      }
    });

    // Add CHECK constraints for audit_logs
    await queryInterface.addConstraint('audit_logs', {
      fields: ['action'],
      type: 'check',
      name: 'chk_audit_action_valid',
      where: {
        action: {
          [Sequelize.Op.in]: ['INSERT', 'UPDATE', 'DELETE']
        }
      }
    });

    // Add CHECK constraints for roles
    await queryInterface.addConstraint('roles', {
      fields: ['permission_level'],
      type: 'check',
      name: 'chk_permission_level_positive',
      where: {
        permission_level: {
          [Sequelize.Op.gte]: 0
        }
      }
    });

    // Add CHECK constraints for apartments
    await queryInterface.addConstraint('apartments', {
      fields: ['floor_number'],
      type: 'check',
      name: 'chk_floor_number_positive',
      where: {
        floor_number: {
          [Sequelize.Op.gte]: 1
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all constraints in reverse order
    const constraints = [
      'chk_floor_number_positive',
      'chk_permission_level_positive',
      'chk_audit_action_valid',
      'chk_action_type_valid',
      'chk_pst_role_valid',
      'chk_notification_priority_valid',
      'chk_slot_number_range',
      'chk_transfer_status_valid',
      'chk_transfer_different_users',
      'chk_transfer_percentage_range',
      'chk_lease_dates_order',
      'chk_ownership_percentage_range'
    ];

    for (const constraintName of constraints) {
      try {
        await queryInterface.removeConstraint('apartments', constraintName);
      } catch (error) {
        console.log(`Constraint ${constraintName} may not exist, skipping...`);
      }
    }
  }
};