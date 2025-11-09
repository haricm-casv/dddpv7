'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Function to validate total ownership percentage per apartment
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION validate_ownership_percentage()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Check total ownership percentage for the apartment
        IF (SELECT SUM(ownership_percentage)
            FROM ownership_relationships
            WHERE apartment_id = NEW.apartment_id
            AND is_active = true
            AND id != COALESCE(NEW.id, 0)) + NEW.ownership_percentage > 100 THEN
          RAISE EXCEPTION 'Total ownership percentage for apartment % cannot exceed 100%%', NEW.apartment_id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger for ownership_relationships
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_validate_ownership_percentage
        BEFORE INSERT OR UPDATE ON ownership_relationships
        FOR EACH ROW
        EXECUTE FUNCTION validate_ownership_percentage();
    `);

    // Function to prevent PST members from approving their own requests
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION prevent_pst_self_approval()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Check if the approver is a PST member trying to approve their own record
        IF NEW.approved_by_role IN ('President', 'Secretary', 'Treasurer') THEN
          -- For ownership transfers
          IF TG_TABLE_NAME = 'ownership_transfers' THEN
            IF NEW.approved_by_user_id = NEW.from_user_id OR NEW.approved_by_user_id = NEW.to_user_id THEN
              RAISE EXCEPTION 'PST members cannot approve their own ownership transfer requests';
            END IF;
          END IF;

          -- For user registrations (check if approver is the user being approved)
          IF TG_TABLE_NAME = 'users' AND NEW.id = NEW.approved_by_user_id THEN
            RAISE EXCEPTION 'PST members cannot approve their own registration';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Triggers for relevant tables
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_prevent_pst_self_approval_transfers
        BEFORE UPDATE ON ownership_transfers
        FOR EACH ROW
        EXECUTE FUNCTION prevent_pst_self_approval();
    `);

    // Function to update updated_at timestamp
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Add triggers for tables that need automatic updated_at updates
    const tablesWithUpdatedAt = [
      'roles',
      'professions',
      'apartments',
      'users',
      'ownership_relationships',
      'tenant_relationships',
      'ownership_transfers',
      'parking_slots'
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trg_update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    // Function to log audit trail
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION audit_trigger_function()
      RETURNS TRIGGER AS $$
      DECLARE
        old_row JSONB;
        new_row JSONB;
        action_type TEXT;
        user_id INTEGER;
      BEGIN
        -- Get the current user from session/application context
        -- This would need to be set by the application
        user_id := NULL; -- Placeholder, should be set by application

        IF TG_OP = 'INSERT' THEN
          action_type := 'INSERT';
          old_row := NULL;
          new_row := row_to_json(NEW)::JSONB;
        ELSIF TG_OP = 'UPDATE' THEN
          action_type := 'UPDATE';
          old_row := row_to_json(OLD)::JSONB;
          new_row := row_to_json(NEW)::JSONB;
        ELSIF TG_OP = 'DELETE' THEN
          action_type := 'DELETE';
          old_row := row_to_json(OLD)::JSONB;
          new_row := NULL;
        END IF;

        -- Insert audit log (only if user_id is available)
        IF user_id IS NOT NULL THEN
          INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_value,
            new_value,
            created_at
          ) VALUES (
            user_id,
            action_type,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            old_row,
            new_row,
            CURRENT_TIMESTAMP
          );
        END IF;

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Add audit triggers to critical tables
    const auditTables = [
      'users',
      'ownership_relationships',
      'tenant_relationships',
      'ownership_transfers',
      'parking_slots'
    ];

    for (const table of auditTables) {
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trg_audit_${table}
          AFTER INSERT OR UPDATE OR DELETE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION audit_trigger_function();
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop audit triggers
    const auditTables = [
      'users',
      'ownership_relationships',
      'tenant_relationships',
      'ownership_transfers',
      'parking_slots'
    ];

    for (const table of auditTables) {
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trg_audit_${table} ON ${table};
      `);
    }

    // Drop updated_at triggers
    const tablesWithUpdatedAt = [
      'roles',
      'professions',
      'apartments',
      'users',
      'ownership_relationships',
      'tenant_relationships',
      'ownership_transfers',
      'parking_slots'
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trg_update_${table}_updated_at ON ${table};
      `);
    }

    // Drop business logic triggers
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_prevent_pst_self_approval_transfers ON ownership_transfers;
    `);
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_validate_ownership_percentage ON ownership_relationships;
    `);

    // Drop functions
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS audit_trigger_function();
    `);
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `);
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS prevent_pst_self_approval();
    `);
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS validate_ownership_percentage();
    `);
  }
};