#!/usr/bin/env node

const { sequelize } = require('../src/config/database');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');

async function runMigrations() {
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../src/migrations/*.js'),
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context, Sequelize),
          down: async () => migration.down(context, Sequelize),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  try {
    console.log('Running migrations...');
    await umzug.up();
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function rollbackMigrations() {
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../src/migrations/*.js'),
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context, Sequelize),
          down: async () => migration.down(context, Sequelize),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  try {
    console.log('Rolling back last migration...');
    await umzug.down();
    console.log('Rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'down' || command === 'rollback') {
  rollbackMigrations();
} else {
  runMigrations();
}