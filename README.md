# DD Diamond Park Apartment Management System

## Project Overview

**Domain:** dddp.online
**Current User Base:** 70+ users
**Technology Stack:** React.js + Node.js/Express + PostgreSQL
**Deployment:** Razorhost with GitHub Actions CI/CD

This repository contains the complete architecture design and implementation specifications for the DD Diamond Park Apartment Management System, a comprehensive web application for managing apartment ownership, tenant relationships, and community governance.

## 🏗️ System Architecture

The system is built with a modern web architecture featuring:

- **Frontend:** React.js with responsive design
- **Backend:** Node.js/Express API with RESTful endpoints
- **Database:** PostgreSQL with comprehensive schema design
- **Security:** JWT authentication with role-based access control
- **Real-time Features:** WebSocket notifications and live updates

## 🎯 Key Features

### PST Committee Management
- **Instant Approval Authority:** President, Secretary, and Treasurer can approve critical requests instantly
- **Priority Dashboard:** Dedicated interface for managing pending approvals and transfers
- **Audit Trail:** Complete logging of all PST committee actions
- **Conflict Prevention:** PST members cannot approve their own requests

### Apartment Management
- **Critical Ordering:** All apartment listings follow floor number (ascending) then type (alphabetical) ordering
- **Ownership Tracking:** Support for multiple owners per apartment with percentage shares
- **Tenant Management:** Lease period tracking with PST-modifiable end dates
- **Transfer Workflows:** Secure ownership transfer approval process

### User Management
- **Role-Based Access:** Hierarchical permission system (Resident → Tenant → Owner → PST → Admin → Super Admin)
- **Multi-Role Support:** Users can have multiple roles simultaneously
- **Self-Service Profiles:** Users can edit their own information
- **Bulk Operations:** CSV import/export for efficient user management

## 📁 Documentation Structure

This repository contains comprehensive documentation for the entire system:

### Core Architecture
- [`architecture_design.md`](architecture_design.md) - High-level system architecture and component breakdown
- [`project_structure.md`](project_structure.md) - Complete folder organization and file structure
- [`api_endpoints.md`](api_endpoints.md) - Comprehensive REST API specification (60+ endpoints)

### Technical Implementation
- [`database_schema_plan.md`](database_schema_plan.md) - PostgreSQL schema with 12 core tables and constraints
- [`security_implementation.md`](security_implementation.md) - Authentication, authorization, and security measures
- [`notification_system.md`](notification_system.md) - Real-time notification system with PST priority routing

### Deployment & Operations
- [`deployment_strategy.md`](deployment_strategy.md) - Razorhost-specific deployment configuration
- [`ci_cd_pipeline.md`](ci_cd_pipeline.md) - GitHub Actions automated deployment pipeline
- [`deployment_checklist.md`](deployment_checklist.md) - Pre-launch validation and rollback procedures

### Project Management
- [`implementation_roadmap.md`](implementation_roadmap.md) - 6-week phased development plan
- [`dddesignv2.md`](dddesignv2.md) - Original detailed specification document

## 🚀 Implementation Phases

### Phase 1: Foundation System (Weeks 1-2)
- Database schema and core infrastructure
- Authentication and user management
- Basic apartment and role management

### Phase 2: Core Features (Weeks 3-4)
- PST Committee setup and permissions
- Approval workflows and notifications
- Multi-role dashboard system

### Phase 3: Enhanced Security & UX (Weeks 5-6)
- Advanced security features and audit logging
- Email notifications and performance optimization
- Production-ready deployment

## 🔐 Security Features

- **JWT Authentication:** Secure token-based authentication with refresh mechanism
- **Role-Based Access Control:** Hierarchical permissions with PST special authorities
- **PST Conflict Prevention:** Automated prevention of self-approval scenarios
- **Comprehensive Audit Logging:** All critical actions logged with user context
- **Input Validation:** Server-side validation for all data inputs
- **Security Headers:** CSP, HSTS, XSS protection, and CSRF prevention

## 📊 Success Metrics

- **Registration Completion Rate:** Target 95%
- **PST Response Time:** Target <6 hours for critical decisions
- **System Uptime:** Target 99.5%
- **User Satisfaction:** Target 4.5/5

## 🛠️ Technology Stack

### Frontend
- React.js 18+
- React Router for navigation
- Axios for API communication
- Styled Components for styling
- React Hook Form for form management

### Backend
- Node.js 18+ with Express.js
- PostgreSQL with Sequelize ORM
- JWT for authentication
- bcryptjs for password hashing
- Winston for logging

### DevOps
- GitHub Actions for CI/CD
- PM2 for process management
- Nginx for reverse proxy
- Let's Encrypt for SSL

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Git for version control
- Razorhost account with Node.js support

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dddp-apartment-management
   ```

2. **Set up the database**
   ```sql
   -- Follow database_schema_plan.md for complete setup
   CREATE DATABASE dddp_development;
   -- Run migrations and seeds
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Configure environment**
   ```bash
   # Copy and configure environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

5. **Start development servers**
   ```bash
   # Backend (from backend directory)
   npm run dev

   # Frontend (from frontend directory)
   npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is confidential and intended for DD Diamond Park development team use only.

## 📞 Support

- **Technical Support:** support@dddp.online
- **Admin Support:** admin@dddp.online
- **Emergency Contact:** Available in deployment documentation

## 🔄 Version History

- **v3.0:** Consolidated PST Committee integration and complete architecture design
- **v2.0:** Enhanced features and notification system
- **v1.0:** Initial specification and requirements

---

**Domain:** dddp.online
**Status:** Architecture Complete - Ready for Implementation
**Last Updated:** November 8, 2025