module.exports = {
  apps: [{
    name: 'dddp-backend-staging',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    error_file: '../logs/err-staging.log',
    out_file: '../logs/out-staging.log',
    log_file: '../logs/combined-staging.log',
    time: true,
    watch: false,
    max_memory_restart: '256M',
    restart_delay: 4000,
    autorestart: true,
    env_file: '.env'
  }]
};