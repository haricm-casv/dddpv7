# DD Diamond Park Apartment Management System - Architecture Design

## System Overview

**Project:** DD Diamond Park Apartment Management System
**Domain:** dddp.online
**Technology Stack:**
- Frontend: React.js
- Backend: Node.js/Express
- Database: PostgreSQL
- Deployment: Razorhost (standard web hosting with Node.js support)
- CI/CD: GitHub Actions

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │    │   Express.js    │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend API   │◄──►│   Database      │
│   (Client)      │    │   (Server)      │    │   (Data Layer)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Razorhost     │
                    │   Hosting       │
                    │   Environment   │
                    └─────────────────┘
```

### Component Breakdown

#### 1. Frontend (React.js)
- **Authentication Module**
  - Login/Logout components
  - Password reset flow
  - Session management

- **Dashboard System**
  - Role-based dashboard routing
  - PST Committee dashboard with priority queue
  - Owner dashboard with apartment management
  - Admin dashboard with system overview

- **User Management**
  - Registration form with validation
  - Profile management (self-service)
  - Role switching interface

- **Apartment Management**
  - Apartment listing with floor/type ordering
  - Ownership transfer workflows
  - Tenant lease management

- **Notification System**
  - Bell icon with unread count
  - Notification center
  - PST priority notifications

- **Admin/PST Interfaces**
  - User approval workflows
  - Bulk operations (CSV import/export)
  - Audit logging views
  - Parking slot management

#### 2. Backend (Node.js/Express)
- **API Layer**
  - RESTful API endpoints
  - Authentication middleware
  - Role-based authorization
  - Input validation

- **Business Logic**
  - User registration and approval workflows
  - PST Committee decision processing
  - Ownership transfer logic
  - Notification management

- **Data Access Layer**
  - Database connection and pooling
  - Query optimization
  - Transaction management
  - Migration scripts

- **Security Layer**
  - Password hashing (bcrypt)
  - JWT token management
  - Rate limiting
  - Input sanitization

#### 3. Database (PostgreSQL)
- **Core Tables** (as per specification)
  - apartments (with floor/type indexing)
  - users (with mobile uniqueness)
  - roles (PST Committee roles)
  - user_roles (multiple role support)
  - ownership_relationships
  - tenant_relationships
  - ownership_transfers
  - notifications
  - pst_committee_actions
  - audit_logs
  - professions
  - parking_slots

### Key Architectural Decisions

#### 1. Apartment Ordering (CRITICAL)
- **Database Level:** Composite index on (floor_number ASC, unit_type ASC)
- **Application Level:** All queries include ORDER BY floor_number, unit_type
- **API Level:** Consistent ordering in all responses
- **Frontend Level:** Maintain order in dropdowns and lists

#### 2. PST Committee Architecture
- **Permission Level:** 80 (higher than Admin Level 90 for special permissions)
- **Approval Logic:** Any single PST member can approve (President/Secretary/Treasurer)
- **Conflict Prevention:** PST members cannot approve own requests
- **Audit Trail:** All PST actions logged in pst_committee_actions table

#### 3. Role-Based Access Control (RBAC)
- **Hierarchical Permissions:** Level 10 (Resident) → 30 (Tenant) → 50 (Owner) → 80 (PST) → 90 (Admin) → 100 (Super Admin)
- **Multiple Roles:** Users can have multiple roles simultaneously
- **Role Switching:** UI allows switching between assigned roles
- **Permission Inheritance:** Higher level roles include lower level permissions

#### 4. Notification System
- **In-App Notifications:** Real-time updates with bell icon
- **PST Priority:** Special notification channels for critical decisions
- **Email Integration:** Future phase (SMTP configuration)
- **Categorization:** Low, Medium, High, Critical priority levels

#### 5. Security Architecture
- **Authentication:** JWT tokens with refresh mechanism
- **Password Policy:** Minimum 6 chars, alphanumeric + special symbols
- **Session Management:** Secure session handling with expiration
- **Audit Logging:** All critical actions logged with user context

### Deployment Architecture

#### Razorhost Environment
- **Web Server:** Nginx (if supported) or Express static serving
- **Application Server:** Node.js runtime
- **Database:** PostgreSQL (managed or self-hosted)
- **SSL:** Let's Encrypt integration
- **File Storage:** Local file system or cloud storage (future)

#### CI/CD Pipeline (GitHub Actions)
```
GitHub Push/PR → Build → Test → Deploy to Staging → Manual Approval → Deploy to Production
```

#### Environment Configuration
- **Development:** Local development environment
- **Staging:** Razorhost staging environment
- **Production:** Razorhost production environment
- **Environment Variables:** Secure key management

### Scalability Considerations

#### Database Optimization
- **Indexing Strategy:** Critical indexes for apartment ordering, user lookups
- **Query Optimization:** Efficient queries for large datasets (70+ users, 200+ apartments)
- **Connection Pooling:** Proper connection management

#### Performance Optimization
- **Frontend:** Code splitting, lazy loading, caching
- **Backend:** Response compression, caching layers
- **Database:** Query optimization, read replicas (future)

#### Monitoring & Logging
- **Application Logs:** Structured logging with Winston
- **Error Tracking:** Error boundaries and reporting
- **Performance Monitoring:** Response time tracking
- **Database Monitoring:** Query performance and connection health

### Security Implementation

#### Authentication & Authorization
- **JWT Strategy:** Access tokens with short expiry, refresh tokens
- **Password Security:** bcrypt hashing, strength validation
- **Session Security:** HttpOnly cookies, secure flags

#### Data Protection
- **Input Validation:** Server-side validation for all inputs
- **SQL Injection Prevention:** Parameterized queries
- **XSS Protection:** Input sanitization, CSP headers
- **CSRF Protection:** Token-based protection

#### PST-Specific Security
- **Permission Validation:** Extra checks for PST actions
- **Audit Trail:** Complete logging of all PST decisions
- **Conflict Prevention:** Self-approval blocking logic

### Data Flow Diagrams

#### User Registration Flow
```
User Form → Client Validation → Server Validation → Create User (pending_approval) → Notify PST Committee → PST Approval → Activate User → Email Verification → Login Access
```

#### Ownership Transfer Flow
```
Owner Request → Validate Ownership → Notify PST Committee → PST Approval → Update Relationships → Notify Parties → Audit Log
```

#### PST Decision Flow
```
Request Submitted → All PST Members Notified → First PST Response → Request Closed → Other PST Notified → Audit Logged
```

### Implementation Phases Alignment

#### Phase 1 (Weeks 1-2): Foundation
- Database schema implementation
- Basic authentication system
- User registration foundation
- Apartment ordering logic

#### Phase 2 (Weeks 3-4): Core Features
- Role management and PST setup
- Approval workflows
- Notification system
- Bulk operations

#### Phase 3 (Weeks 5-6): Security & Polish
- Enhanced security features
- Email notifications
- Audit logging
- Performance optimization

### Risk Mitigation

#### Technical Risks
- **Apartment Ordering:** Database constraints and application-level validation
- **PST Permissions:** Comprehensive testing of approval workflows
- **Data Migration:** Thorough testing with backup/rollback procedures
- **Performance:** Load testing and query optimization

#### Operational Risks
- **Deployment:** Staging environment testing, rollback procedures
- **Security:** Regular audits, vulnerability scanning
- **Scalability:** Monitoring and performance baselines
- **User Adoption:** Training materials, support documentation

### Success Metrics Alignment

#### Functional Requirements
- **Registration Completion:** >95% success rate
- **PST Response Time:** <6 hours for critical decisions
- **System Uptime:** >99.5%
- **Apartment Ordering:** 100% consistency across all interfaces

#### Performance Targets
- **Page Load Time:** <2 seconds
- **PST Dashboard:** <1.5 seconds
- **API Response:** <1 second for most operations

This architecture provides a solid foundation for the DD Diamond Park Apartment Management System, ensuring scalability, security, and maintainability while meeting all specified requirements for PST Committee functionality and apartment management workflows.