'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // View for properly ordered apartments
    await queryInterface.sequelize.query(`
      CREATE VIEW apartments_ordered AS
      SELECT
        *,
        CONCAT(floor_number, ' ', unit_type) as display_name
      FROM apartments
      WHERE is_active = true
      ORDER BY floor_number ASC, unit_type ASC;
    `);

    // Comprehensive user profile view
    await queryInterface.sequelize.query(`
      CREATE VIEW user_profiles AS
      SELECT
        u.*,
        p.name as profession_name,
        array_agg(DISTINCT r.role_name) FILTER (WHERE ur.is_active = true) as roles,
        array_agg(DISTINCT CONCAT(a.floor_number, ' ', a.unit_type)) FILTER (WHERE ur.is_active = true AND ur.apartment_id IS NOT NULL) as apartment_names,
        COUNT(DISTINCT n.id) FILTER (WHERE n.is_read = false) as unread_notifications
      FROM users u
      LEFT JOIN professions p ON u.profession_id = p.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN apartments a ON ur.apartment_id = a.id
      LEFT JOIN notifications n ON u.id = n.user_id
      WHERE u.is_active = true
      GROUP BY u.id, p.name;
    `);

    // Ownership summary view
    await queryInterface.sequelize.query(`
      CREATE VIEW ownership_summary AS
      SELECT
        a.id as apartment_id,
        a.floor_number,
        a.unit_type,
        a.unit_number,
        a.building_name,
        COUNT(o.id) as owner_count,
        SUM(o.ownership_percentage) as total_ownership_percentage,
        STRING_AGG(u.full_name, ', ') as owner_names,
        STRING_AGG(o.ownership_percentage::text || '%', ', ') as ownership_percentages
      FROM apartments a
      LEFT JOIN ownership_relationships o ON a.id = o.apartment_id AND o.is_active = true
      LEFT JOIN users u ON o.user_id = u.id
      WHERE a.is_active = true
      GROUP BY a.id, a.floor_number, a.unit_type, a.unit_number, a.building_name
      ORDER BY a.floor_number ASC, a.unit_type ASC;
    `);

    // Tenancy summary view
    await queryInterface.sequelize.query(`
      CREATE VIEW tenancy_summary AS
      SELECT
        a.id as apartment_id,
        a.floor_number,
        a.unit_type,
        a.unit_number,
        a.building_name,
        t.id as tenancy_id,
        u.full_name as tenant_name,
        u.mobile_number as tenant_mobile,
        t.lease_start_date,
        t.lease_end_date,
        t.is_auto_renew,
        t.approved_by_role,
        t.approved_at
      FROM apartments a
      LEFT JOIN tenant_relationships t ON a.id = t.apartment_id AND t.is_active = true
      LEFT JOIN users u ON t.user_id = u.id
      WHERE a.is_active = true
      ORDER BY a.floor_number ASC, a.unit_type ASC;
    `);

    // Parking slots summary view
    await queryInterface.sequelize.query(`
      CREATE VIEW parking_summary AS
      SELECT
        p.id,
        p.slot_number,
        a.floor_number,
        a.unit_type,
        a.unit_number,
        u.full_name as assigned_to_name,
        u.mobile_number as assigned_to_mobile,
        p.vehicle_info,
        p.assignment_date,
        p.is_active
      FROM parking_slots p
      LEFT JOIN apartments a ON p.apartment_id = a.id
      LEFT JOIN users u ON p.assigned_to_user_id = u.id
      ORDER BY p.slot_number ASC;
    `);

    // PST committee activity view
    await queryInterface.sequelize.query(`
      CREATE VIEW pst_activity_summary AS
      SELECT
        pca.pst_member_user_id,
        u.full_name as pst_member_name,
        pca.pst_role,
        pca.action_type,
        pca.target_table,
        COUNT(*) as action_count,
        MAX(pca.created_at) as last_action_date
      FROM pst_committee_actions pca
      JOIN users u ON pca.pst_member_user_id = u.id
      WHERE u.is_active = true
      GROUP BY pca.pst_member_user_id, u.full_name, pca.pst_role, pca.action_type, pca.target_table
      ORDER BY pca.pst_member_user_id, pca.action_type;
    `);

    // Recent notifications view
    await queryInterface.sequelize.query(`
      CREATE VIEW recent_notifications AS
      SELECT
        n.*,
        u.full_name as recipient_name,
        sender.full_name as sender_name
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN users sender ON n.sent_by_user_id = sender.id
      WHERE n.created_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY n.created_at DESC;
    `);

    // Ownership transfer requests view
    await queryInterface.sequelize.query(`
      CREATE VIEW transfer_requests AS
      SELECT
        ot.*,
        a.floor_number,
        a.unit_type,
        a.unit_number,
        from_user.full_name as from_user_name,
        from_user.mobile_number as from_user_mobile,
        to_user.full_name as to_user_name,
        to_user.mobile_number as to_user_mobile,
        approver.full_name as approved_by_name
      FROM ownership_transfers ot
      JOIN apartments a ON ot.apartment_id = a.id
      JOIN users from_user ON ot.from_user_id = from_user.id
      JOIN users to_user ON ot.to_user_id = to_user.id
      LEFT JOIN users approver ON ot.approved_by_user_id = approver.id
      ORDER BY ot.request_date DESC;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop views in reverse order
    const views = [
      'transfer_requests',
      'recent_notifications',
      'pst_activity_summary',
      'parking_summary',
      'tenancy_summary',
      'ownership_summary',
      'user_profiles',
      'apartments_ordered'
    ];

    for (const view of views) {
      await queryInterface.sequelize.query(`
        DROP VIEW IF EXISTS ${view};
      `);
    }
  }
};