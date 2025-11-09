module.exports = {
  apps: [{
    name: 'dddp-backend',
    script: 'src/server.js', // Adjust if built version exists
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '256M', // Adjusted for shared hosting
    restart_delay: 4000,
    autorestart: true,
    // Environment variables will be loaded from .env file
    env_file: '.env'
  }]
};