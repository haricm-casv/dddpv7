'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Seed roles
    await queryInterface.bulkInsert('roles', [
      {
        role_name: 'Super Admin',
        permission_level: 100,
        description: 'Full system access',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_name: 'Admin',
        permission_level: 90,
        description: 'Cannot assign roles above Level 80',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_name: 'President',
        permission_level: 80,
        description: 'PST Committee member - instant approval authority',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_name: 'Secretary',
        permission_level: 80,
        description: 'PST Committee member - instant approval authority',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_name: 'Treasurer',
        permission_level: 80,
        description: 'PST Committee member - instant approval authority',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_name: 'Owner',
        permission_level: 50,
        description: 'Can manage own apartments',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_name: 'Tenant',
        permission_level: 30,
        description: 'Limited to own profile',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_name: 'Resident',
        permission_level: 10,
        description: 'Read-only access',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Seed professions
    await queryInterface.bulkInsert('professions', [
      {
        name: 'Software Engineer',
        is_custom: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Doctor',
        is_custom: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Teacher',
        is_custom: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Business Owner',
        is_custom: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Retired',
        is_custom: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Student',
        is_custom: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Other',
        is_custom: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Seed sample apartments (DD Diamond Park layout)
    const apartments = [];
    const unitTypes = ['A', 'B', 'C', 'D', 'E'];

    for (let floor = 1; floor <= 15; floor++) {
      for (const unitType of unitTypes) {
        apartments.push({
          floor_number: floor,
          unit_type: unitType,
          unit_number: `${floor}${unitType}`,
          square_footage: Math.floor(Math.random() * 500) + 800, // Random between 800-1300 sq ft
          building_name: 'DD Diamond Park',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    await queryInterface.bulkInsert('apartments', apartments, {});

    // Seed parking slots (1-200)
    const parkingSlots = [];
    for (let i = 1; i <= 200; i++) {
      parkingSlots.push({
        slot_number: i,
        apartment_id: null, // Will be assigned later
        assigned_to_user_id: null,
        vehicle_info: null,
        assignment_date: null,
        assigned_by_user_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    await queryInterface.bulkInsert('parking_slots', parkingSlots, {});
  },

  down: async (queryInterface, Sequelize) => {
    // Remove seeded data in reverse order
    await queryInterface.bulkDelete('parking_slots', null, {});
    await queryInterface.bulkDelete('apartments', null, {});
    await queryInterface.bulkDelete('professions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  }
};