# Database Schema Implementation Plan

## Overview

**Database:** PostgreSQL 13+
**ORM:** Sequelize (Node.js)
**Migration Strategy:** Incremental migrations with rollback capability
**Indexing Strategy:** Performance-optimized indexes for critical queries

## Core Tables Schema

### 1. roles
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permission_level INTEGER NOT NULL CHECK (permission_level >= 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_roles_name ON roles(role_name);
CREATE INDEX idx_roles_permission_level ON roles(permission_level);

-- Predefined data
INSERT INTO roles (role_name, permission_level, description) VALUES
('Super Admin', 100, 'Full system access'),
('Admin', 90, 'Cannot assign roles above Level 80'),
('President', 80, 'PST Committee member - instant approval authority'),
('Secretary', 80, 'PST Committee member - instant approval authority'),
('Treasurer', 80, 'PST Committee member - instant approval authority'),
('Owner', 50, 'Can manage own apartments'),
('Tenant', 30, 'Limited to own profile'),
('Resident', 10, 'Read-only access');
```

### 2. professions
```sql
CREATE TABLE professions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_professions_name ON professions(name);
CREATE INDEX idx_professions_active ON professions(is_active);

-- Initial seed data
INSERT INTO professions (name, is_custom) VALUES
('Software Engineer', false),
('Doctor', false),
('Teacher', false),
('Business Owner', false),
('Retired', false),
('Student', false),
('Other', false);
```

### 3. apartments
```sql
CREATE TABLE apartments (
    id SERIAL PRIMARY KEY,
    floor_number INTEGER NOT NULL CHECK (floor_number > 0),
    unit_type VARCHAR(10) NOT NULL,
    unit_number VARCHAR(10) NOT NULL,
    square_footage DECIMAL(10,2),
    building_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Critical: Unique constraint and index for apartment ordering
    UNIQUE(floor_number, unit_type, unit_number)
);

-- Critical indexes for apartment ordering (floor ASC, type ASC)
CREATE INDEX idx_apartments_floor_type ON apartments(floor_number ASC, unit_type ASC);
CREATE INDEX idx_apartments_active ON apartments(is_active);

-- Display name computed column (for ordering display)
-- Note: PostgreSQL doesn't have computed columns, so we'll handle this in application layer
-- Display format: "floor + space + type" (e.g., "1 A", "13 E")
```

### 4. users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE,
    mobile_number VARCHAR(20) UNIQUE NOT NULL,
    profession_id INTEGER REFERENCES professions(id),
    alternate_contact VARCHAR(20),
    emergency_contact_name VARCHAR(200),
    emergency_contact_number VARCHAR(20),
    vehicle_info TEXT,
    profile_photo_url VARCHAR(500),
    password_hash VARCHAR(255) NOT NULL,
    must_reset_password BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    mobile_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_mobile ON users(mobile_number);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### 5. user_roles
```sql
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    apartment_id INTEGER REFERENCES apartments(id), -- Nullable for global roles like PST
    is_active BOOLEAN DEFAULT true,
    assigned_by_user_id INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE,

    -- Ensure unique active role assignments
    UNIQUE(user_id, role_id, apartment_id, is_active)
);

-- Indexes
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_apartment ON user_roles(apartment_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_user_apartment ON user_roles(user_id, apartment_id);
```

### 6. ownership_relationships
```sql
CREATE TABLE ownership_relationships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage BETWEEN 0 AND 100),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    approved_by_user_id INTEGER REFERENCES users(id),
    approved_by_role VARCHAR(50), -- 'Admin', 'President', 'Secretary', 'Treasurer'
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure total ownership doesn't exceed 100% per apartment
    CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100)
);

-- Indexes
CREATE INDEX idx_ownership_user ON ownership_relationships(user_id);
CREATE INDEX idx_ownership_apartment ON ownership_relationships(apartment_id);
CREATE INDEX idx_ownership_active ON ownership_relationships(is_active);
CREATE UNIQUE INDEX idx_ownership_active_user_apartment ON ownership_relationships(user_id, apartment_id) WHERE is_active = true;
```

### 7. tenant_relationships
```sql
CREATE TABLE tenant_relationships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    lease_start_date DATE NOT NULL,
    lease_end_date DATE NOT NULL,
    is_auto_renew BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    approved_by_user_id INTEGER REFERENCES users(id),
    approved_by_role VARCHAR(50), -- 'Admin', 'President', 'Secretary', 'Treasurer'
    approved_at TIMESTAMP WITH TIME ZONE,
    modified_by_pst BOOLEAN DEFAULT false, -- Flag if PST modified lease period
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Lease validation
    CHECK (lease_end_date > lease_start_date)
);

-- Indexes
CREATE INDEX idx_tenant_user ON tenant_relationships(user_id);
CREATE INDEX idx_tenant_apartment ON tenant_relationships(apartment_id);
CREATE INDEX idx_tenant_active ON tenant_relationships(is_active);
CREATE INDEX idx_tenant_lease_end ON tenant_relationships(lease_end_date);
CREATE UNIQUE INDEX idx_tenant_active_user_apartment ON tenant_relationships(user_id, apartment_id) WHERE is_active = true;
```

### 8. ownership_transfers
```sql
CREATE TABLE ownership_transfers (
    id SERIAL PRIMARY KEY,
    apartment_id INTEGER NOT NULL REFERENCES apartments(id),
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by_user_id INTEGER REFERENCES users(id),
    approved_by_role VARCHAR(50), -- 'President', 'Secretary', 'Treasurer'
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    transfer_completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Validation
    CHECK (from_user_id != to_user_id),
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Indexes
CREATE INDEX idx_transfers_status ON ownership_transfers(status);
CREATE INDEX idx_transfers_apartment ON ownership_transfers(apartment_id);
CREATE INDEX idx_transfers_from_user ON ownership_transfers(from_user_id);
CREATE INDEX idx_transfers_to_user ON ownership_transfers(to_user_id);
CREATE INDEX idx_transfers_request_date ON ownership_transfers(request_date DESC);
```

### 9. parking_slots
```sql
CREATE TABLE parking_slots (
    id SERIAL PRIMARY KEY,
    slot_number INTEGER UNIQUE NOT NULL CHECK (slot_number BETWEEN 1 AND 200),
    apartment_id INTEGER REFERENCES apartments(id),
    assigned_to_user_id INTEGER REFERENCES users(id),
    vehicle_info VARCHAR(255),
    assignment_date DATE,
    assigned_by_user_id INTEGER REFERENCES users(id), -- Admin or PST member
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Validation
    CHECK (slot_number >= 1 AND slot_number <= 200)
);

-- Indexes
CREATE UNIQUE INDEX idx_parking_slot_number ON parking_slots(slot_number);
CREATE INDEX idx_parking_apartment ON parking_slots(apartment_id);
CREATE INDEX idx_parking_assigned_user ON parking_slots(assigned_to_user_id);
```

### 10. notifications
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    sent_by_user_id INTEGER REFERENCES users(id),
    sent_by_role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Validation
    CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);
```

### 11. pst_committee_actions
```sql
CREATE TABLE pst_committee_actions (
    id SERIAL PRIMARY KEY,
    pst_member_user_id INTEGER NOT NULL REFERENCES users(id),
    pst_role VARCHAR(20) NOT NULL CHECK (pst_role IN ('President', 'Secretary', 'Treasurer')),
    action_type VARCHAR(50) NOT NULL, -- 'approval', 'rejection', 'override', 'modification'
    target_table VARCHAR(50) NOT NULL,
    target_record_id INTEGER NOT NULL,
    action_details JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Validation
    CHECK (pst_role IN ('President', 'Secretary', 'Treasurer')),
    CHECK (action_type IN ('approval', 'rejection', 'override', 'modification'))
);

-- Indexes
CREATE INDEX idx_pst_actions_member ON pst_committee_actions(pst_member_user_id);
CREATE INDEX idx_pst_actions_type ON pst_committee_actions(action_type);
CREATE INDEX idx_pst_actions_created ON pst_committee_actions(created_at DESC);
```

### 12. audit_logs
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    user_role VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Validation
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

## Database Constraints and Triggers

### 1. Ownership Percentage Trigger
```sql
-- Function to validate total ownership percentage per apartment
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

-- Trigger for ownership_relationships
CREATE TRIGGER trg_validate_ownership_percentage
    BEFORE INSERT OR UPDATE ON ownership_relationships
    FOR EACH ROW
    EXECUTE FUNCTION validate_ownership_percentage();
```

### 2. PST Self-Approval Prevention Trigger
```sql
-- Function to prevent PST members from approving their own requests
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

-- Triggers for relevant tables
CREATE TRIGGER trg_prevent_pst_self_approval_transfers
    BEFORE UPDATE ON ownership_transfers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_pst_self_approval();
```

### 3. Apartment Ordering View
```sql
-- View for properly ordered apartments
CREATE VIEW apartments_ordered AS
SELECT
    *,
    CONCAT(floor_number, ' ', unit_type) as display_name
FROM apartments
WHERE is_active = true
ORDER BY floor_number ASC, unit_type ASC;
```

### 4. User Profile View
```sql
-- Comprehensive user profile view
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
```

## Migration Strategy

### Migration Files Structure
```
migrations/
├── 001_initial_schema.sql
├── 002_add_indexes.sql
├── 003_add_constraints.sql
├── 004_add_triggers.sql
├── 005_add_audit_tables.sql
├── 006_add_pst_actions.sql
├── 007_add_notifications.sql
├── 008_seed_initial_data.sql
└── 009_migrate_existing_users.sql (for production)
```

### Sequelize Migration Example
```javascript
// migrations/001_initial_schema.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('apartments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      floor_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: { min: 1 }
      },
      unit_type: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      unit_number: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      square_footage: Sequelize.DECIMAL(10, 2),
      building_name: Sequelize.STRING(100),
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE
    });

    // Add unique constraint
    await queryInterface.addIndex('apartments', ['floor_number', 'unit_type', 'unit_number'], {
      unique: true,
      name: 'idx_apartments_unique'
    });

    // Critical ordering index
    await queryInterface.addIndex('apartments', ['floor_number', 'unit_type'], {
      name: 'idx_apartments_floor_type'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('apartments');
  }
};
```

## Performance Optimization

### 1. Indexing Strategy
- **Primary Keys:** All tables have auto-incrementing primary keys
- **Foreign Keys:** Indexed automatically by PostgreSQL
- **Critical Queries:** Apartment ordering, user lookups, notification queries
- **Composite Indexes:** For multi-column WHERE clauses

### 2. Query Optimization
- **Pagination:** Use LIMIT/OFFSET for large result sets
- **Select Fields:** Only select required columns
- **Joins:** Use appropriate join types (INNER, LEFT)
- **Subqueries:** Avoid where possible, use JOINs

### 3. Connection Pooling
```javascript
// Database configuration with connection pooling
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});
```

## Backup and Recovery

### 1. Automated Backup Script
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/www/dddp.online/backups"
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

# Create backup
pg_dump -U dddp_user -h localhost dddp_production > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete
```

### 2. Point-in-Time Recovery
```sql
-- Restore from backup
-- 1. Stop application
-- 2. Drop and recreate database
-- 3. Restore from backup file
-- 4. Run migrations if needed
-- 5. Start application
```

## Data Integrity Checks

### 1. Ownership Validation Function
```sql
-- Function to validate ownership percentages
CREATE OR REPLACE FUNCTION validate_apartment_ownership(apartment_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    SELECT SUM(ownership_percentage) INTO total_percentage
    FROM ownership_relationships
    WHERE apartment_id = apartment_id_param AND is_active = true;

    RETURN total_percentage = 100.0;
END;
$$ LANGUAGE plpgsql;
```

### 2. Data Consistency Checks
```sql
-- Check all apartments have valid ownership
SELECT a.id, a.floor_number, a.unit_type, a.unit_number,
       SUM(o.ownership_percentage) as total_ownership
FROM apartments a
LEFT JOIN ownership_relationships o ON a.id = o.apartment_id AND o.is_active = true
WHERE a.is_active = true
GROUP BY a.id, a.floor_number, a.unit_type, a.unit_number
HAVING SUM(o.ownership_percentage) != 100.0 OR SUM(o.ownership_percentage) IS NULL;
```

This database schema provides a robust foundation for the DD Diamond Park Apartment Management System, ensuring data integrity, performance, and scalability while supporting all PST Committee functionality and apartment management requirements.