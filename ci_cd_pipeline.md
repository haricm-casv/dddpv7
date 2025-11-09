# CI/CD Pipeline Design for DD Diamond Park Apartment Management System

## Overview

**Platform:** GitHub Actions
**Deployment Target:** Razorhost
**Workflow Strategy:** Automated testing and deployment with manual approval for production

## Pipeline Architecture

### Workflow Overview
```
Git Push/PR → Code Quality → Testing → Build → Staging Deploy → Manual Approval → Production Deploy
```

### Branch Strategy
- **main:** Production branch (protected, requires PR approval)
- **develop:** Development branch for feature integration
- **feature/***: Feature branches for individual development
- **hotfix/***: Emergency fixes directly to main

## GitHub Actions Workflows

### 1. CI Pipeline (ci.yml) - Runs on every push/PR

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: |
          frontend/package-lock.json
          backend/package-lock.json

    - name: Install backend dependencies
      run: |
        cd backend
        npm ci

    - name: Install frontend dependencies
      run: |
        cd frontend
        npm ci

    - name: Lint backend code
      run: |
        cd backend
        npm run lint

    - name: Lint frontend code
      run: |
        cd frontend
        npm run lint

    - name: Run backend tests
      run: |
        cd backend
        npm test -- --coverage --watchAll=false
      env:
        NODE_ENV: test
        DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

    - name: Run frontend tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false --passWithNoTests
      env:
        CI: true

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage/lcov.info
        flags: backend
        name: Backend Coverage

    - name: Upload coverage reports (Frontend)
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info
        flags: frontend
        name: Frontend Coverage

  security-scan:
    runs-on: ubuntu-latest
    needs: lint-and-test

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: 'trivy-results.sarif'

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-test, security-scan]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: |
          frontend/package-lock.json
          backend/package-lock.json

    - name: Build frontend
      run: |
        cd frontend
        npm ci
        npm run build
      env:
        REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
        REACT_APP_VERSION: ${{ github.sha }}

    - name: Build backend
      run: |
        cd backend
        npm ci
        npm run build
      env:
        NODE_ENV: production

    - name: Upload frontend build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: frontend-build
        path: frontend/build/
        retention-days: 7

    - name: Upload backend build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: backend-build
        path: backend/dist/
        retention-days: 7
```

### 2. Staging Deployment (deploy-staging.yml)

```yaml
name: Deploy to Staging

on:
  push:
    branches: [ develop ]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Download frontend build artifacts
      uses: actions/download-artifact@v3
      with:
        name: frontend-build
        path: frontend/build/

    - name: Download backend build artifacts
      uses: actions/download-artifact@v3
      with:
        name: backend-build
        path: backend/dist/

    - name: Deploy to staging server
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ${{ secrets.STAGING_USER }}
        key: ${{ secrets.STAGING_SSH_KEY }}
        script: |
          # Create backup
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          mkdir -p /var/www/staging.dddp.online/backups/$TIMESTAMP

          # Stop services
          cd /var/www/staging.dddp.online
          pm2 stop ecosystem-staging.config.js || true

          # Backup current deployment
          cp -r frontend/build backups/$TIMESTAMP/ 2>/dev/null || true
          cp -r backend backups/$TIMESTAMP/ 2>/dev/null || true

          # Deploy frontend
          rm -rf frontend/build
          cp -r ~/frontend/build frontend/

          # Deploy backend
          rm -rf backend/dist
          cp -r ~/backend/dist backend/
          cd backend
          npm ci --production --ignore-scripts

          # Run migrations (if any)
          npm run migrate || true

          # Start services
          cd ..
          pm2 start ecosystem-staging.config.js
          pm2 save

          # Health check
          sleep 15
          curl -f http://staging.dddp.online/health || exit 1

    - name: Run staging tests
      run: |
        npm install -g artillery
        artillery run staging-tests.yml --output staging-report.json
      env:
        STAGING_URL: ${{ secrets.STAGING_URL }}

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: staging-test-results
        path: staging-report.json
        retention-days: 7
```

### 3. Production Deployment (deploy-production.yml)

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      force_deploy:
        description: 'Force deploy without approval'
        required: false
        default: 'false'

jobs:
  test:
    uses: ./.github/workflows/ci.yml

  security-audit:
    runs-on: ubuntu-latest
    needs: test

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run security audit
      run: |
        cd backend
        npm audit --audit-level high
        cd ../frontend
        npm audit --audit-level high

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, security-audit]
    environment: production
    if: github.ref == 'refs/heads/main' || github.event.inputs.force_deploy == 'true'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Build frontend
      run: |
        cd frontend
        npm ci
        npm run build
      env:
        REACT_APP_API_URL: ${{ secrets.PROD_REACT_APP_API_URL }}
        REACT_APP_VERSION: ${{ github.sha }}

    - name: Build backend
      run: |
        cd backend
        npm ci
        npm run build
      env:
        NODE_ENV: production

    - name: Deploy to production server
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USER }}
        key: ${{ secrets.PROD_SSH_KEY }}
        script: |
          # Create backup with timestamp
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          BACKUP_DIR="/var/www/dddp.online/backups/$TIMESTAMP"
          mkdir -p $BACKUP_DIR

          cd /var/www/dddp.online

          # Stop services gracefully
          pm2 stop ecosystem.config.js || true
          sleep 5

          # Create backup
          cp -r frontend/build $BACKUP_DIR/ 2>/dev/null || true
          cp -r backend $BACKUP_DIR/ 2>/dev/null || true

          # Deploy frontend
          rm -rf frontend/build
          cp -r ~/frontend/build frontend/

          # Deploy backend
          rm -rf backend/dist
          cp -r ~/backend/dist backend/
          cd backend
          npm ci --production --ignore-scripts

          # Run database migrations
          npm run migrate

          # Start services
          cd ..
          pm2 start ecosystem.config.js --env production
          pm2 save

          # Health check with retry
          for i in {1..5}; do
            if curl -f -s https://dddp.online/health > /dev/null; then
              echo "Health check passed"
              break
            else
              echo "Health check failed, attempt $i"
              sleep 10
            fi
          done

          # Final health check
          curl -f https://dddp.online/health || exit 1

    - name: Run production smoke tests
      run: |
        npm install -g artillery
        artillery run production-smoke-tests.yml --output prod-smoke-report.json
      env:
        PROD_URL: ${{ secrets.PROD_URL }}

    - name: Notify deployment success
      if: success()
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: 'Production deployment successful for DD Diamond Park System'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

    - name: Notify deployment failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: 'Production deployment failed for DD Diamond Park System'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

    - name: Rollback on failure
      if: failure()
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USER }}
        key: ${{ secrets.PROD_SSH_KEY }}
        script: |
          cd /var/www/dddp.online

          # Find latest backup
          LATEST_BACKUP=$(ls -t backups/ | head -1)

          if [ -n "$LATEST_BACKUP" ]; then
            echo "Rolling back to backup: $LATEST_BACKUP"

            # Stop services
            pm2 stop ecosystem.config.js || true

            # Restore from backup
            rm -rf frontend/build
            cp -r backups/$LATEST_BACKUP/build frontend/

            rm -rf backend
            cp -r backups/$LATEST_BACKUP/backend backend/

            # Start services
            pm2 start ecosystem.config.js --env production
            pm2 save

            echo "Rollback completed"
          else
            echo "No backup found for rollback"
          fi
```

## Environment Configuration

### GitHub Secrets Required
```
# Staging Environment
STAGING_HOST
STAGING_USER
STAGING_SSH_KEY
STAGING_URL

# Production Environment
PROD_HOST
PROD_USER
PROD_SSH_KEY
PROD_URL
PROD_REACT_APP_API_URL

# Database
TEST_DATABASE_URL

# Notifications
SLACK_WEBHOOK_URL

# Security
SONAR_TOKEN (optional for SonarQube integration)
```

### Environment Files
```bash
# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db:5432/dddp_staging
JWT_SECRET=staging-jwt-secret
REDIS_URL=redis://staging-redis:6379

# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/dddp_production
JWT_SECRET=prod-jwt-secret
REDIS_URL=redis://prod-redis:6379
```

## Testing Strategy

### 1. Unit Tests
- **Backend:** Jest with Supertest for API testing
- **Frontend:** React Testing Library for component testing
- **Coverage:** Minimum 80% coverage required

### 2. Integration Tests
- **API Integration:** Test API endpoints with real database
- **E2E Tests:** Playwright or Cypress for critical user flows

### 3. Performance Tests
- **Load Testing:** Artillery for API load testing
- **Smoke Tests:** Basic functionality tests post-deployment

### 4. Security Testing
- **SAST:** SonarQube integration
- **Dependency Scanning:** npm audit
- **Container Scanning:** Trivy for vulnerabilities

## Monitoring & Alerting

### 1. Application Monitoring
```yaml
# In workflow file
- name: Setup monitoring
  run: |
    # Install monitoring tools
    npm install -g clinic
    # Run performance monitoring
    clinic doctor -- node server.js &
    sleep 30
    pkill -f clinic
```

### 2. Error Tracking
- **Sentry Integration:** For error tracking and alerting
- **Log Aggregation:** Centralized logging with Winston
- **Alert Rules:** Configure alerts for critical errors

### 3. Performance Monitoring
- **Response Times:** Track API response times
- **Error Rates:** Monitor error rates by endpoint
- **Resource Usage:** CPU, memory, disk monitoring

## Rollback Strategy

### 1. Automated Rollback
- **Database Rollback:** Point-in-time recovery
- **Application Rollback:** Restore from backup artifacts
- **Configuration Rollback:** Environment variable rollback

### 2. Manual Rollback
```bash
# Manual rollback script
#!/bin/bash
echo "Starting manual rollback..."

# Stop services
pm2 stop ecosystem.config.js

# Restore from specific backup
BACKUP_TIMESTAMP=$1
if [ -z "$BACKUP_TIMESTAMP" ]; then
  echo "Usage: $0 <backup_timestamp>"
  exit 1
fi

# Restore application
cp -r backups/$BACKUP_TIMESTAMP/* /var/www/dddp.online/

# Restore database if needed
# pg_restore -U user -d db_name backups/db_$BACKUP_TIMESTAMP.sql

# Start services
pm2 start ecosystem.config.js --env production

echo "Rollback completed"
```

## Branch Protection Rules

### Main Branch Protection
```yaml
# GitHub Branch Protection Rules for 'main'
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators
- Restrict pushes that create matching branches
- Allow force pushes: false
- Allow deletions: false
```

### Quality Gates
- **Test Coverage:** >80%
- **Security Scan:** Pass
- **Linting:** Pass
- **Build:** Success
- **Manual Approval:** Required for production

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan clean
- [ ] Code review completed
- [ ] Database migrations tested
- [ ] Rollback plan documented

### Deployment
- [ ] Backup created
- [ ] Services stopped gracefully
- [ ] Files deployed
- [ ] Database migrations run
- [ ] Services started
- [ ] Health checks passing

### Post-Deployment
- [ ] Smoke tests executed
- [ ] Monitoring alerts configured
- [ ] User notifications sent
- [ ] Documentation updated

## Cost Optimization

### GitHub Actions Costs
- **Free Tier:** 2,000 minutes/month for public repos
- **Paid Tier:** $0.008/minute for additional minutes
- **Optimization:** Use caching, parallel jobs, and efficient workflows

### Storage Costs
- **Artifacts:** 7-day retention, automatic cleanup
- **Logs:** Compressed and archived
- **Backups:** Rotate old backups automatically

This CI/CD pipeline provides automated, secure, and reliable deployment capabilities for the DD Diamond Park Apartment Management System, ensuring high-quality releases with comprehensive testing and monitoring.