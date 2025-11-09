# Deployment Strategy for DD Diamond Park Apartment Management System

## Overview

**Target Platform:** Razorhost (Standard web hosting with Node.js support)
**Domain:** dddp.online
**Technology Stack:** React.js + Node.js/Express + PostgreSQL
**CI/CD:** GitHub Actions for automated deployment

## Infrastructure Requirements

### Razorhost Environment Setup

#### 1. Hosting Plan Requirements
- **Node.js Support:** Version 18+ (LTS)
- **Database:** PostgreSQL 13+ (managed or self-hosted)
- **Storage:** Minimum 10GB SSD storage
- **Memory:** 2GB+ RAM recommended
- **SSL Support:** Let's Encrypt integration
- **Backup:** Daily automated backups

#### 2. Domain Configuration
- **Primary Domain:** dddp.online
- **SSL Certificate:** Auto-renewing Let's Encrypt
- **DNS Configuration:** Point A/CNAME records to Razorhost
- **Subdomains:** Optional (api.dddp.online for API separation if needed)

#### 3. Database Setup
- **PostgreSQL Instance:** Dedicated database server
- **Connection Pooling:** Enabled for performance
- **Backup Strategy:** Daily backups with 30-day retention
- **Replication:** Master-slave setup for high availability (future)

### Application Architecture for Deployment

#### 1. Single Server Architecture (Recommended for Razorhost)
```
Internet → Nginx (SSL Termination) → Node.js Application → PostgreSQL
```

#### 2. Application Structure
```
/var/www/dddp.online/
├── frontend/          # Built React.js application
├── backend/           # Node.js/Express API
├── shared/            # Shared utilities (optional)
├── logs/              # Application logs
├── backups/           # Database backups
└── config/            # Environment configurations
```

#### 3. Process Management
- **PM2:** Process manager for Node.js application
- **Auto-restart:** Automatic restart on crashes
- **Load Balancing:** Single instance (upgrade path available)
- **Monitoring:** PM2 monitoring dashboard

## Deployment Pipeline

### Phase 1: Initial Setup

#### 1. Razorhost Account Configuration
```bash
# Server access setup
ssh user@razorhost-server
mkdir -p /var/www/dddp.online/{frontend,backend,logs,backups,config}
cd /var/www/dddp.online

# Install Node.js (if not pre-installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL client (if needed)
sudo apt-get install postgresql-client
```

#### 2. Database Initialization
```sql
-- Create database and user
CREATE DATABASE dddp_production;
CREATE USER dddp_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE dddp_production TO dddp_user;

-- Create extensions
\c dddp_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

#### 3. Environment Configuration
```bash
# Production environment file
cat > /var/www/dddp.online/config/.env.production << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://dddp_user:secure_password@localhost:5432/dddp_production
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
FRONTEND_URL=https://dddp.online
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USER=your-email@dddp.online
EMAIL_PASS=your-app-password
SESSION_SECRET=your-session-secret
EOF
```

### Phase 2: Application Deployment

#### 1. Backend Deployment
```bash
cd /var/www/dddp.online/backend

# Install dependencies
npm ci --production

# Run database migrations
npm run migrate

# Seed initial data (roles, professions, etc.)
npm run seed

# Build application (if needed)
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 2. Frontend Deployment
```bash
cd /var/www/dddp.online/frontend

# Install dependencies
npm ci

# Build for production
npm run build

# The build output will be in /var/www/dddp.online/frontend/build
```

#### 3. Nginx Configuration
```nginx
# /etc/nginx/sites-available/dddp.online
server {
    listen 80;
    server_name dddp.online www.dddp.online;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dddp.online www.dddp.online;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/dddp.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dddp.online/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend (React.js)
    location / {
        root /var/www/dddp.online/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # API caching (optional)
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### 4. SSL Certificate Setup
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d dddp.online -d www.dddp.online

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Phase 3: CI/CD Pipeline (GitHub Actions)

#### 1. GitHub Repository Structure
```
dddp-apartment-management/
├── .github/
│   └── workflows/
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile (optional)
├── backend/
│   ├── src/
│   ├── package.json
│   ├── ecosystem.config.js
│   └── Dockerfile (optional)
├── docker-compose.yml (optional)
├── README.md
└── deployment/
    ├── nginx.conf
    ├── docker-compose.prod.yml
    └── scripts/
```

#### 2. GitHub Actions Workflow (deploy-production.yml)
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install backend dependencies
        run: |
          cd backend
          npm ci

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Run backend tests
        run: |
          cd backend
          npm test

      - name: Run frontend tests
        run: |
          cd frontend
          npm test -- --watchAll=false

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build

      - name: Deploy to Razorhost
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.RAZORHOST_HOST }}
          username: ${{ secrets.RAZORHOST_USER }}
          key: ${{ secrets.RAZORHOST_SSH_KEY }}
          script: |
            cd /var/www/dddp.online

            # Backup current deployment
            TIMESTAMP=$(date +%Y%m%d_%H%M%S)
            mkdir -p backups/$TIMESTAMP
            cp -r frontend/build backups/$TIMESTAMP/ 2>/dev/null || true
            cp -r backend backups/$TIMESTAMP/ 2>/dev/null || true

            # Update backend
            cd backend
            git pull origin main
            npm ci --production
            npm run migrate

            # Update frontend
            cd ../frontend
            git pull origin main
            npm ci
            npm run build

            # Restart services
            cd ..
            pm2 restart ecosystem.config.js --env production
            pm2 save

            # Health check
            sleep 10
            curl -f https://dddp.online/health || exit 1

            # Clean up old backups (keep last 5)
            cd backups
            ls -t | tail -n +6 | xargs -r rm -rf
```

#### 3. PM2 Ecosystem Configuration
```javascript
// backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'dddp-backend',
    script: 'dist/server.js', // or 'src/server.js' if not compiled
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/www/dddp.online/logs/err.log',
    out_file: '/var/www/dddp.online/logs/out.log',
    log_file: '/var/www/dddp.online/logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    autorestart: true
  }]
};
```

## Monitoring & Maintenance

### 1. Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# Logs monitoring
pm2 logs dddp-backend --lines 100

# Status check
pm2 status
```

### 2. Database Monitoring
```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/www/dddp.online/backups"
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

# Create backup
pg_dump -U dddp_user -h localhost dddp_production > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Optional: Upload to cloud storage
# aws s3 cp $BACKUP_FILE.gz s3://dddp-backups/
```

## Rollback Procedures

### 1. Application Rollback
```bash
cd /var/www/dddp.online

# Stop application
pm2 stop ecosystem.config.js

# Restore from backup
LATEST_BACKUP=$(ls -t backups/ | head -1)
cp -r backups/$LATEST_BACKUP/frontend/build frontend/
cp -r backups/$LATEST_BACKUP/backend backend/

# Restart application
pm2 start ecosystem.config.js --env production
```

### 2. Database Rollback
```bash
# Restore from backup
LATEST_BACKUP=$(ls -t backups/db_backup_*.sql.gz | head -1)
gunzip -c $LATEST_BACKUP | psql -U dddp_user -h localhost dddp_production
```

## Security Hardening

### 1. Server Security
```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Secure SSH
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 2. Application Security
- **Environment Variables:** Store secrets securely
- **Input Validation:** Server-side validation for all inputs
- **Rate Limiting:** Implement API rate limiting
- **HTTPS Only:** Force SSL/TLS encryption
- **Security Headers:** Implement security headers in Nginx

## Performance Optimization

### 1. Nginx Optimization
```nginx
# Worker processes
worker_processes auto;

# Events
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

# HTTP optimizations
http {
    # Buffer sizes
    client_max_body_size 50M;
    client_body_buffer_size 128k;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;

    # Gzip
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
}
```

### 2. Node.js Optimization
```javascript
// Cluster mode for multi-core utilization (future scaling)
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start server
  require('./server');
}
```

## Migration Strategy

### 1. Data Migration (70+ Existing Users)
```javascript
// migration script
const migrateExistingUsers = async () => {
  // 1. Export existing user data
  // 2. Transform data to match new schema
  // 3. Bulk insert into new database
  // 4. Set temporary passwords
  // 5. Send password reset emails
  // 6. Assign PST Committee roles
  // 7. Create ownership relationships
};
```

### 2. Zero-Downtime Deployment
- **Blue-Green Deployment:** Deploy to staging first
- **Feature Flags:** Gradually enable new features
- **Rollback Plan:** Quick rollback capability
- **Monitoring:** Real-time monitoring during deployment

## Cost Optimization

### Razorhost Plan Selection
- **Basic Plan:** Suitable for initial launch (70 users)
- **Scalable Plan:** Upgrade path for growth
- **Backup Add-ons:** Additional backup storage if needed
- **SSL Certificate:** Included or minimal cost

### Resource Monitoring
- **CPU Usage:** Monitor application performance
- **Memory Usage:** Track memory consumption
- **Disk Space:** Monitor storage growth
- **Bandwidth:** Track data transfer costs

This deployment strategy provides a robust, scalable, and secure foundation for the DD Diamond Park Apartment Management System on Razorhost, with comprehensive CI/CD automation and monitoring capabilities.