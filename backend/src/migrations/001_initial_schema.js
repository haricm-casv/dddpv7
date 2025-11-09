'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create roles table
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      role_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      permission_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: { min: 0 }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create professions table
    await queryInterface.createTable('professions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      is_custom: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create apartments table
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
      square_footage: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      building_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      full_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      mobile_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      profession_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'professions',
          key: 'id'
        }
      },
      alternate_contact: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      emergency_contact_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      emergency_contact_number: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      vehicle_info: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      profile_photo_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      must_reset_password: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      mobile_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create user_roles table
    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        }
      },
      apartment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'apartments',
          key: 'id'
        }
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      assigned_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      assigned_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      deactivated_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create ownership_relationships table
    await queryInterface.createTable('ownership_relationships', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      apartment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'apartments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      ownership_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      approved_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approved_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create tenant_relationships table
    await queryInterface.createTable('tenant_relationships', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      apartment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'apartments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      lease_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      lease_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      is_auto_renew: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      approved_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approved_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      modified_by_pst: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create ownership_transfers table
    await queryInterface.createTable('ownership_transfers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      apartment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'apartments',
          key: 'id'
        }
      },
      from_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      to_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      ownership_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      request_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      approved_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approved_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      approval_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      transfer_completion_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create parking_slots table
    await queryInterface.createTable('parking_slots', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      slot_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      apartment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'apartments',
          key: 'id'
        }
      },
      assigned_to_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      vehicle_info: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      assignment_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      assigned_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      notification_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      link_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
        allowNull: false
      },
      sent_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      sent_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create pst_committee_actions table
    await queryInterface.createTable('pst_committee_actions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      pst_member_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      pst_role: {
        type: Sequelize.ENUM('President', 'Secretary', 'Treasurer'),
        allowNull: false
      },
      action_type: {
        type: Sequelize.ENUM('approval', 'rejection', 'override', 'modification'),
        allowNull: false
      },
      target_table: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      target_record_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      action_details: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create audit_logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      action: {
        type: Sequelize.ENUM('INSERT', 'UPDATE', 'DELETE'),
        allowNull: false
      },
      table_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      record_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      old_value: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      new_value: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      user_role: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order to handle foreign key constraints
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('pst_committee_actions');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('parking_slots');
    await queryInterface.dropTable('ownership_transfers');
    await queryInterface.dropTable('tenant_relationships');
    await queryInterface.dropTable('ownership_relationships');
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('apartments');
    await queryInterface.dropTable('professions');
    await queryInterface.dropTable('roles');
  }
};