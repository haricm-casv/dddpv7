#!/usr/bin/env node

const { sequelize } = require('../src/config/database');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');

async function runSeeders() {
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../src/seeders/*.js'),
      resolve: ({ name, path: seederPath, context }) => {
        const seeder = require(seederPath);
        return {
          name,
          up: async () => seeder.up(context, require('sequelize')),
          down: async () => seeder.down(context, require('sequelize')),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({
      sequelize,
      tableName: 'seeders_meta' // Separate table for seeders
    }),
    logger: console,
  });

  try {
    console.log('Running seeders...');
    await umzug.up();
    console.log('Seeders completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function rollbackSeeders() {
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../src/seeders/*.js'),
      resolve: ({ name, path: seederPath, context }) => {
        const seeder = require(seederPath);
        return {
          name,
          up: async () => seeder.up(context, require('sequelize')),
          down: async () => seeder.down(context, require('sequelize')),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({
      sequelize,
      tableName: 'seeders_meta'
    }),
    logger: console,
  });

  try {
    console.log('Rolling back last seeder...');
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
  rollbackSeeders();
} else {
  runSeeders();
}