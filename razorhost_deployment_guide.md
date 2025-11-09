# Razorhost Deployment Guide for DD Diamond Park System

## Overview

**Target:** test.dddp.online (staging environment)
**Platform:** Razorhost shared hosting with Node.js support
**Domain:** dddp.online (main domain)
**Subdomain:** test.dddp.online (for staging/testing)

## Prerequisites

### 1. Razorhost Account Setup
- [ ] Active Razorhost hosting account
- [ ] Node.js runtime enabled (version 18+)
- [ ] SSH access configured
- [ ] Domain dddp.online pointed to Razorhost nameservers

### 2. Domain Configuration
- [ ] Main domain: dddp.online → production
- [ ] Subdomain: test.dddp.online → staging/testing
- [ ] DNS propagation completed (24-48 hours)

### 3. Local Development Environment
- [ ] Git repository cloned locally
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database access (local or cloud)
- [ ] SSH client configured

## Step-by-Step Deployment Process

### Phase 1: Infrastructure Setup

#### 1.1 SSH Access to Razorhost
```bash
# Connect to your Razorhost server
ssh your_username@your_razorhost_server

# Navigate to web directory
cd /home/your_username/public_html

# Or if using a different web root
cd /var/www/html
```

#### 1.2 Create Directory Structure
```bash
# Create main directories
mkdir -p test.dddp.online/{frontend,backend,logs,backups,config}

# Set proper permissions
chmod 755 test.dddp.online
chmod 755 test.dddp.online/{frontend,backend,logs,backups,config}
```

#### 1.3 Node.js Environment Check
```bash
# Check Node.js version
node --version
# Should be 18.x or higher

# Check npm version
npm --version

# If Node.js not available, contact Razorhost support
# Some shared hosts require specific activation
```

#### 1.4 Database Setup
```bash
# Option 1: Use Razorhost PostgreSQL (if provided)
# Contact Razorhost support for PostgreSQL access

# Option 2: Use external PostgreSQL service
# Services like: ElephantSQL, AWS RDS, DigitalOcean Managed DB

# Example connection string for external DB:
# postgresql://username:password@hostname:5432/database_name
```

### Phase 2: Application Deployment

#### 2.1 Clone Repository
```bash
cd /home/your_username/test.dddp.online

# Clone the architecture repository
git clone https://github.com/haricm-casv/dddpv7.git .

# Or if you have direct access to implementation repo:
# git clone https://github.com/your-repo/dddp-implementation.git .
```

#### 2.2 Backend Deployment
```bash
cd backend

# Install dependencies
npm install --production

# Create environment configuration
cat > .env << EOF
NODE_ENV=staging
PORT=3001
HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://your_db_connection_string

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-here

# Email Configuration (optional for staging)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=https://test.dddp.online

# Logging
LOG_LEVEL=info
EOF

# Run database migrations (when implemented)
# npm run migrate

# Test backend startup
timeout 10s npm start || echo "Backend test completed"
```

#### 2.3 Frontend Deployment
```bash
cd ../frontend

# Install dependencies
npm install

# Create environment configuration
cat > .env << EOF
REACT_APP_API_URL=https://test.dddp.online/api
REACT_APP_ENV=staging
REACT_APP_VERSION=1.0.0-staging
EOF

# Build for production
npm run build

# Move build to web-accessible directory
mv build ../frontend/
```

### Phase 3: Web Server Configuration

#### 3.1 Nginx Configuration for test.dddp.online
```nginx
# /etc/nginx/sites-available/test.dddp.online
server {
    listen 80;
    server_name test.dddp.online;

    # Redirect HTTP to HTTPS (if SSL enabled)
    # return 301 https://$server_name$request_uri;
}

# If SSL is available:
# server {
#     listen 443 ssl http2;
#     server_name test.dddp.online;
#
#     ssl_certificate /path/to/ssl/cert;
#     ssl_certificate_key /path/to/ssl/key;
#
#     # SSL configuration...
# }

# Fallback for shared hosting - use .htaccess or Razorhost control panel
```

#### 3.2 Apache .htaccess Configuration (Shared Hosting)
```apache
# .htaccess in /home/your_username/public_html/test.dddp.online/frontend/
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Handle client-side routing
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-XSS-Protection "1; mode=block"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-downgrade"
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

#### 3.3 Node.js Process Management
```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'dddp-backend-staging',
    script: '/home/your_username/test.dddp.online/backend/src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    error_file: '/home/your_username/test.dddp.online/logs/err.log',
    out_file: '/home/your_username/test.dddp.online/logs/out.log',
    log_file: '/home/your_username/test.dddp.online/logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '256M',
    restart_delay: 4000,
    autorestart: true
  }]
};
EOF

# Start the application
pm2 start ecosystem.config.js --env staging
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs dddp-backend-staging
```

### Phase 4: Domain and SSL Setup

#### 4.1 Subdomain Configuration
```bash
# In Razorhost control panel:
# 1. Go to Domain Management
# 2. Add subdomain: test.dddp.online
# 3. Point to directory: /home/your_username/public_html/test.dddp.online/frontend/
# 4. Set document root to build/ directory
```

#### 4.2 SSL Certificate (Let's Encrypt)
```bash
# If Razorhost supports Let's Encrypt:
# 1. Go to SSL/TLS section in control panel
# 2. Request free SSL for test.dddp.online
# 3. Auto-renewal should be enabled

# Manual SSL setup (if needed):
sudo apt-get install certbot
sudo certbot certonly --webroot -w /home/your_username/public_html/test.dddp.online/frontend -d test.dddp.online
```

### Phase 5: Testing and Validation

#### 5.1 Frontend Testing
```bash
# Test frontend accessibility
curl -I https://test.dddp.online

# Should return HTTP 200
# Content-Type: text/html
```

#### 5.2 Backend API Testing
```bash
# Test backend health endpoint
curl https://test.dddp.online/api/health

# Should return:
# {"success":true,"status":"healthy","environment":"staging"}
```

#### 5.3 Database Connection Testing
```bash
# Test database connectivity
cd backend
node -e "
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);
sequelize.authenticate().then(() => {
  console.log('Database connection successful');
  process.exit(0);
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});
"
```

#### 5.4 Full System Testing
```bash
# Test key user flows:
# 1. Access test.dddp.online
# 2. User registration page loads
# 3. API endpoints respond
# 4. Database operations work
# 5. Error handling functions
```

## Razorhost-Specific Considerations

### 1. Resource Limitations
- **Memory Limits:** Monitor PM2 for memory usage (<256MB recommended)
- **CPU Limits:** Single-threaded Node.js application
- **Storage Limits:** Regular cleanup of logs and backups
- **Process Limits:** One PM2 process for staging

### 2. Shared Hosting Constraints
- **Port Restrictions:** Use standard ports (80, 443)
- **Process Persistence:** PM2 handles process management
- **File Permissions:** Correct permissions for web-accessible files
- **Cron Jobs:** Limited cron job support

### 3. Backup Strategy
```bash
# Create backup script
cat > /home/your_username/test.dddp.online/scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/your_username/test.dddp.online/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
  /home/your_username/test.dddp.online/frontend/build \
  /home/your_username/test.dddp.online/backend

# Backup database (if using Razorhost PostgreSQL)
# pg_dump your_database > $BACKUP_DIR/db_backup_$DATE.sql

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable and schedule
chmod +x /home/your_username/test.dddp.online/scripts/backup.sh

# Add to crontab (if available)
# crontab -e
# 0 2 * * * /home/your_username/test.dddp.online/scripts/backup.sh
```

## Troubleshooting Common Issues

### 1. Node.js Not Starting
```bash
# Check Node.js path
which node
which npm

# Check for missing dependencies
cd backend
npm ls --depth=0

# Check environment variables
cat .env

# Check PM2 logs
pm2 logs dddp-backend-staging
```

### 2. Database Connection Issues
```bash
# Test database connection
psql "your_connection_string" -c "SELECT version();"

# Check connection string format
# postgresql://username:password@hostname:5432/database

# Verify firewall settings (if applicable)
```

### 3. Frontend Not Loading
```bash
# Check file permissions
ls -la /home/your_username/public_html/test.dddp.online/frontend/build/

# Verify .htaccess configuration
cat /home/your_username/public_html/test.dddp.online/frontend/.htaccess

# Check for JavaScript errors in browser console
```

### 4. SSL Issues
```bash
# Check SSL certificate
openssl s_client -connect test.dddp.online:443 -servername test.dddp.online

# Verify certificate validity
# Check Razorhost SSL configuration
```

## Monitoring and Maintenance

### 1. Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# Check application logs
pm2 logs dddp-backend-staging --lines 50

# Health check script
cat > /home/your_username/test.dddp.online/scripts/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="https://test.dddp.online/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Health check passed"
else
    echo "$(date): Health check failed with code $RESPONSE"
    # Send alert (if email configured)
fi
EOF
```

### 2. Log Rotation
```bash
# Configure log rotation for PM2 logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. Performance Optimization
- **Enable Gzip compression** in Razorhost control panel
- **Browser caching** for static assets
- **CDN integration** (optional, if supported)
- **Database query optimization** (when implemented)

## Migration to Production

### When Ready for Production (dddp.online)
1. **Repeat deployment process** for main domain
2. **Update environment variables** for production
3. **Configure production database**
4. **Set up production SSL certificate**
5. **Update DNS records** if needed
6. **Test thoroughly** before going live
7. **Set up production monitoring**

### Rollback Plan
- **Keep staging environment** as backup
- **Database backups** before production deployment
- **Application backups** before updates
- **Quick rollback scripts** ready

## Support and Resources

### Razorhost Resources
- **Control Panel:** Access your Razorhost account dashboard
- **File Manager:** Upload/manage files
- **Database Manager:** phpMyAdmin or similar for database access
- **SSL Manager:** Certificate management
- **Support Ticket:** Contact Razorhost for hosting-specific issues

### Application Resources
- **GitHub Repository:** https://github.com/haricm-casv/dddpv7
- **Documentation:** See repository docs/ folder
- **Implementation Roadmap:** implementation_roadmap.md
- **Deployment Checklist:** deployment_checklist.md

This guide provides a complete step-by-step process for deploying the DD Diamond Park Apartment Management System to test.dddp.online on Razorhost, with considerations for shared hosting limitations and best practices for staging environment deployment.