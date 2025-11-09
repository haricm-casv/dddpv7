# Project Structure and Organization

## Overview

**Project:** DD Diamond Park Apartment Management System
**Architecture:** Monorepo with separate frontend/backend directories
**Technology Stack:** React.js + Node.js/Express + PostgreSQL

## Root Directory Structure

```
dddp-apartment-management/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── frontend/
│   ├── public/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── src/
│   ├── tests/
│   ├── migrations/
│   ├── seeds/
│   ├── package.json
│   ├── Dockerfile
│   └── ecosystem.config.js
├── database/
│   ├── schema.sql
│   ├── migrations/
│   └── seeds/
├── docs/
│   ├── api/
│   ├── deployment/
│   └── architecture/
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   └── migrate.sh
├── docker-compose.yml
├── docker-compose.prod.yml
├── README.md
├── LICENSE
└── .gitignore
```

## Frontend Structure (React.js)

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   └── assets/
│       ├── images/
│       └── icons/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── NotificationBell/
│   │   │   └── LoadingSpinner/
│   │   ├── layout/
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── Footer/
│   │   │   └── Navbar/
│   │   ├── auth/
│   │   │   ├── LoginForm/
│   │   │   ├── RegisterForm/
│   │   │   ├── PasswordReset/
│   │   │   └── EmailVerification/
│   │   ├── dashboard/
│   │   │   ├── OwnerDashboard/
│   │   │   ├── TenantDashboard/
│   │   │   ├── ResidentDashboard/
│   │   │   ├── PSTDashboard/
│   │   │   └── AdminDashboard/
│   │   ├── apartments/
│   │   │   ├── ApartmentList/
│   │   │   ├── ApartmentCard/
│   │   │   ├── ApartmentForm/
│   │   │   └── ApartmentSearch/
│   │   ├── users/
│   │   │   ├── UserList/
│   │   │   ├── UserProfile/
│   │   │   ├── UserForm/
│   │   │   └── RoleSwitcher/
│   │   ├── notifications/
│   │   │   ├── NotificationList/
│   │   │   ├── NotificationItem/
│   │   │   └── NotificationCenter/
│   │   ├── approvals/
│   │   │   ├── RegistrationApproval/
│   │   │   ├── TransferApproval/
│   │   │   ├── LeaseApproval/
│   │   │   └── PSTApprovalQueue/
│   │   └── parking/
│       ├── ParkingSlots/
│       ├── ParkingAssignment/
│       └── ParkingForm/
│   ├── pages/
│   │   ├── Home/
│   │   ├── Login/
│   │   ├── Register/
│   │   ├── Dashboard/
│   │   ├── Profile/
│   │   ├── Apartments/
│   │   ├── Users/
│   │   ├── Approvals/
│   │   ├── Reports/
│   │   └── Settings/
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useNotifications.js
│   │   ├── useApartments.js
│   │   ├── useUsers.js
│   │   └── useApi.js
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── apartmentService.js
│   │   ├── notificationService.js
│   │   └── approvalService.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   └── formatters.js
│   ├── context/
│   │   ├── AuthContext.js
│   │   ├── NotificationContext.js
│   │   └── ThemeContext.js
│   ├── styles/
│   │   ├── global.css
│   │   ├── variables.css
│   │   ├── components/
│   │   └── themes/
│   ├── App.js
│   ├── index.js
│   └── routes.js
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── __mocks__/
├── package.json
├── .env.development
├── .env.production
└── README.md
```

## Backend Structure (Node.js/Express)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── email.js
│   │   └── security.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── apartmentController.js
│   │   ├── notificationController.js
│   │   ├── approvalController.js
│   │   ├── parkingController.js
│   │   ├── roleController.js
│   │   └── auditController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Apartment.js
│   │   ├── Role.js
│   │   ├── UserRole.js
│   │   ├── OwnershipRelationship.js
│   │   ├── TenantRelationship.js
│   │   ├── OwnershipTransfer.js
│   │   ├── Notification.js
│   │   ├── PSTCommitteeAction.js
│   │   ├── AuditLog.js
│   │   ├── Profession.js
│   │   └── ParkingSlot.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── apartments.js
│   │   ├── notifications.js
│   │   ├── approvals.js
│   │   ├── parking.js
│   │   ├── roles.js
│   │   └── audit.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── rateLimit.js
│   │   ├── cors.js
│   │   ├── security.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── apartmentService.js
│   │   ├── notificationService.js
│   │   ├── approvalService.js
│   │   ├── emailService.js
│   │   ├── auditService.js
│   │   └── pstService.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   ├── helpers.js
│   │   ├── constants.js
│   │   └── responses.js
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── app.js
│   └── server.js
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── database/
│   └── e2e/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_audit_logs.sql
│   ├── 003_add_pst_actions.sql
│   └── 004_add_notifications.sql
├── seeds/
│   ├── 001_roles.sql
│   ├── 002_professions.sql
│   ├── 003_initial_apartments.sql
│   └── 004_test_users.sql
├── package.json
├── ecosystem.config.js
├── .env.example
└── README.md
```

## Database Structure

```
database/
├── schema.sql                 # Complete database schema
├── migrations/                # Incremental migrations
│   ├── 001_initial_setup.sql
│   ├── 002_add_indexes.sql
│   ├── 003_add_constraints.sql
│   └── 004_add_triggers.sql
├── seeds/                     # Seed data
│   ├── roles.sql
│   ├── professions.sql
│   ├── apartments.sql
│   └── initial_users.sql
└── backups/                   # Backup scripts
    ├── full_backup.sql
    └── incremental_backup.sql
```

## Configuration Files

### Package.json Structure

#### Frontend (package.json)
```json
{
  "name": "dddp-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "react-hook-form": "^7.43.0",
    "react-query": "^3.39.0",
    "react-notifications": "^1.7.4",
    "react-datepicker": "^4.11.0",
    "react-select": "^5.7.0",
    "react-table": "^7.8.0",
    "react-modal": "^3.16.0",
    "react-spinners": "^0.13.0",
    "react-icons": "^4.7.0",
    "styled-components": "^5.3.0",
    "date-fns": "^2.29.0",
    "lodash": "^4.17.0",
    "validator": "^13.9.0"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.0",
    "@testing-library/user-event": "^14.4.0",
    "eslint": "^8.35.0",
    "prettier": "^2.8.0",
    "husky": "^8.0.0",
    "lint-staged": "^13.1.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write src/**/*.{js,jsx,ts,tsx,css,md}"
  }
}
```

#### Backend (package.json)
```json
{
  "name": "dddp-backend",
  "version": "1.0.0",
  "description": "Backend API for DD Diamond Park Apartment Management System",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "build": "babel src --out-dir dist",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .js",
    "lint:fix": "eslint src --ext .js --fix",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.9.0",
    "sequelize": "^6.28.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "express-rate-limit": "^6.7.0",
    "helmet": "^6.0.0",
    "cors": "^2.8.5",
    "express-validator": "^6.15.0",
    "winston": "^3.8.0",
    "nodemailer": "^6.9.0",
    "multer": "^1.4.5-lts.1",
    "redis": "^4.6.0",
    "dotenv": "^16.0.0",
    "uuid": "^9.0.0",
    "joi": "^17.8.0"
  },
  "devDependencies": {
    "@babel/cli": "^7.21.0",
    "@babel/core": "^7.21.0",
    "@babel/preset-env": "^7.20.0",
    "jest": "^29.4.0",
    "supertest": "^6.3.0",
    "nodemon": "^2.0.20",
    "eslint": "^8.35.0",
    "prettier": "^2.8.0"
  }
}
```

## Environment Configuration

### .env.example (Backend)
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=dddp_development
DATABASE_USER=dddp_user
DATABASE_PASSWORD=secure_password
DATABASE_SSL=false

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@dddp.online

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=2097152

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### .env.example (Frontend)
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_VERSION=1.0.0

# Environment
REACT_APP_ENV=development

# Feature Flags
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_EMAIL_VERIFICATION=true
REACT_APP_ENABLE_SMS_NOTIFICATIONS=false
```

## Docker Configuration

### docker-compose.yml (Development)
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: dddp_development
      POSTGRES_USER: dddp_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://dddp_user:secure_password@db:5432/dddp_development
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001/api
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

### Dockerfile (Backend)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3001

CMD ["npm", "start"]
```

## Documentation Structure

```
docs/
├── api/
│   ├── authentication.md
│   ├── users.md
│   ├── apartments.md
│   ├── approvals.md
│   └── notifications.md
├── architecture/
│   ├── system-overview.md
│   ├── database-schema.md
│   ├── security.md
│   └── deployment.md
├── user-guides/
│   ├── admin-manual.md
│   ├── pst-manual.md
│   ├── owner-manual.md
│   ├── tenant-manual.md
│   └── resident-manual.md
└── development/
    ├── setup.md
    ├── testing.md
    ├── deployment.md
    └── contributing.md
```

## Scripts and Automation

```
scripts/
├── setup.sh              # Initial project setup
├── deploy.sh             # Deployment script
├── backup.sh             # Database backup
├── restore.sh            # Database restore
├── migrate.sh            # Run migrations
├── seed.sh               # Run seeds
├── test.sh               # Run all tests
├── lint.sh               # Run linting
└── build.sh              # Build all components
```

This project structure provides a scalable, maintainable foundation for the DD Diamond Park Apartment Management System, with clear separation of concerns and comprehensive organization for development, testing, and deployment.