# DD Diamond Park Apartment Management System
## Complete Implementation Specification

---

## Project Overview

**Project Name:** DD Diamond Park Apartment Management System  
**Domain:** dddp.online  
**Current User Base:** 70+ users  
**Document Version:** 3.0 (Consolidated)  
**Last Updated:** November 8, 2025  
**Status:** Confidential - Development Team Use Only

---

## Organizational Structure

### PST Committee Definition
**PST (President-Secretary-Treasurer Committee)** is the high-power committee responsible for taking critical decisions instantly. The committee consists of three key positions:

1. **President** - Chief decision maker and community leader
2. **Secretary** - Administrative head and communication coordinator
3. **Treasurer** - Financial head and budget manager

**PST Committee Authority:**
- Highest decision-making body after Super Admin
- Permission Level: 80
- Can approve/reject user registrations instantly
- Can approve/reject ownership transfers
- Can modify tenant lease periods
- Receives immediate notifications for all critical requests
- Decisions are binding and logged in audit trail
- Can override standard processes in emergency situations

**PST Committee Workflow:**
- Individual PST members can approve requests independently
- Any single PST member approval is sufficient for standard operations
- Major decisions (ownership transfers, policy changes) should ideally involve consensus
- System logs which PST member approved each request
- PST members cannot approve their own requests (conflict of interest protection)

---

## Global System Conventions

### Apartment Listing Order (CRITICAL - Apply Everywhere)
**All apartment listings throughout the system MUST follow this order:**
1. **Primary Sort:** Floor number (ascending order: 1, 2, 3, 4, ...)
2. **Secondary Sort:** Apartment type (alphabetical order: A, B, C, D, E, ...)
3. **Display Format:** "Floor + Space + Type" (e.g., "1 A", "1 B", "2 A", "13 E")

**Examples of correct ordering:**
- 1 A, 1 B, 1 C, 2 A, 2 B, 2 C, 3 A, 3 B, 13 E, 14 A, 14 B

**Apply this ordering to:**
- All dropdown menus for apartment selection
- Dashboard apartment lists
- Admin apartment management interfaces
- CSV import/export files
- Reports and analytics displays
- API responses containing apartment data
- Search results and filters

---

## Implementation Phases & Timeline

### Phase 1: Foundation System (Weeks 1-2)

**Week 1: Database & Core Infrastructure**
1. Enhanced database schema implementation with apartment-centric model
2. Apartment sorting logic implementation (floor + type ordering)
3. Basic login system with secure session management
4. Password hashing and security infrastructure

**Week 2: User Management Foundation**
5. User registration system with apartment association
6. Self-service profile editing (name, mobile, email, profession)
7. Profession table implementation with dropdown + custom "Other" option
8. Basic role-based dashboard routing
9. Parking slot management system (slots 1-200) with admin assignment

**Deliverables:**
- Fully functional database with proper indexing
- Secure authentication system
- User registration and profile management
- Apartment listing with proper chronological ordering

---

### Phase 2: Core Features (Weeks 3-4)

**Week 3: Role Management & Workflows**
10. Multiple role assignment and switching system
11. Owner dashboard with multiple apartment support
12. Complete approval workflows (Owner → PST Committee/Admin)
13. Ownership transfer approval workflow (PST committee approval required)
14. PST committee member identification and special permissions

**Week 4: Bulk Operations & Notifications**
15. Admin CSV import for bulk operations (maintaining apartment order)
16. In-app notification system (bell icon)
17. Notification center with categorized alerts
18. Approval request tracking and status updates
19. PST-specific notification channels for critical decisions

**Deliverables:**
- Full role-based access control system
- Working approval workflows with PST committee integration
- CSV import functionality
- Multi-role dashboard switching
- PST instant decision-making capability

---

### Phase 3: Enhanced Security & UX (Weeks 5-6)

**Week 5: Security Enhancements**
20. Password enforcement system with navbar warnings
21. Force password reset on first login
22. Enhanced notification system with email integration
23. Security audit logging for all critical actions
24. PST committee action audit trail

**Week 6: Advanced Features & Polish**
25. Role-based dashboard card system
26. Advanced profile management with complete audit logging
27. Performance optimization and caching
28. Mobile responsiveness final testing
29. PST committee dashboard with priority request queue

**Deliverables:**
- Complete security implementation
- Polished user interface with responsive design
- Full audit trail system
- Production-ready application
- PST-optimized workflow interface

---

## User Registration Module

### Registration Form Structure

#### Section 1: Personal Information (Required)
- **Full Name** (text input, required)
  - Validation: 2-100 characters
  - Format: First name + Last name
  
- **Email Address** (email input, required)
  - Validation: Valid email format
  - Uniqueness: Optional (configurable)
  - Verification: Email verification link sent after registration
  
- **Mobile Number** (tel input, required)
  - Validation: 8-15 digits, numeric only
  - Uniqueness: Enforced (must be unique across system)
  - Format: International format support
  
- **Profession** (dropdown + custom input, required)
  - Options: Predefined list from professions table
  - Special option: "Other" allows custom text input
  - Custom entries: Saved to professions table with is_custom=true flag
  
- **Alternate Contact Number** (tel input, optional)
  - Validation: 8-15 digits if provided
  - Format: Same as primary mobile

#### Section 2: Apartment Association (Required)
- **Apartment ID** (dropdown, required)
  - Source: Populated from apartments table
  - **Display Format: "13 E" (floor + space + type)**
  - **Sorting: MUST follow global convention (floor ASC, type ASC)**
  - Validation: Must select existing apartment

#### Section 3: Role & Relationship (Required)
- **Primary Role Requested** (dropdown, required)
  - Options: Owner, Tenant, Resident
  - Default: None (user must select)
  
- **Conditional Fields (If Tenant selected):**
  - **Lease Start Date** (date picker, required for tenants)
    - Validation: Cannot be in past
    - Default: Current date
  
  - **Lease End Date** (date picker, required for tenants)
    - Default: Lease Start Date + 11 months
    - Validation: Must be after lease start date
    - Note: PST Committee can edit this after approval
    - Auto-calculate: System suggests 11-month period

#### Section 4: Account Security (Required)
- **Password** (password input, required)
  - Minimum length: 6 characters
  - Requirements: Alphanumeric + special symbols
  - Strength indicator: Visual feedback on password strength
  
- **Confirm Password** (password input, required)
  - Validation: Must match password exactly

#### Section 5: Additional Information (Optional)
- **Emergency Contact Name** (text input, optional)
- **Emergency Contact Number** (tel input, optional)
- **Vehicle Information** (text input, optional)
  - Note: For future parking assignment use
- **Profile Photo** (file upload, optional)
  - Accepted formats: JPG, PNG
  - Maximum size: 2MB

#### Section 6: Verification & Agreement (Required)
- **Terms & Conditions Agreement** (checkbox, required)
  - Must be checked to proceed
  - Link to full T&C document
  
- **Email Verification** (automatic)
  - System-generated verification email
  - Link expires in 24 hours
  
- **Mobile OTP Verification** (future implementation)
  - Planned for Phase 4

### Registration Flow
1. User completes all required fields
2. Form validation on client-side
3. Submit to server for server-side validation
4. Create user record with status = "pending_approval"
5. Send verification email
6. **PST Committee members and Admin receive instant notification of new registration**
7. **PST member or Admin reviews and approves/rejects (any single PST member can approve)**
8. User receives approval/rejection notification
9. Approved user can login with temporary password (must reset on first login)

---

## Notification System

### Implementation Strategy

#### Phase 1: In-App Notifications (Current Implementation)
- **Notification Bell Icon** in navbar
  - Badge showing unread count
  - Dropdown menu with recent notifications
  - Mark as read functionality
  - Link to full notification center
  - **Priority notification badge for PST members**

#### Phase 2: Email Notifications (Future)
- Email integration for all automated alerts
- Configurable user preferences for email frequency
- HTML email templates with branding
- **Instant email alerts for PST Committee on critical requests**

#### Phase 3: SMS Notifications (Future)
- SMS alerts for critical/time-sensitive notifications
- User opt-in required
- Rate limiting to prevent spam
- **Priority SMS for PST Committee members on urgent matters**

### Notification Types & Triggers

#### 1. Approval-Related Notifications
- **New Registration Request** (to PST Committee/Admin)
  - Trigger: User submits registration
  - Recipients: All active PST Committee members (President, Secretary, Treasurer) + Admin
  - Priority: High
  - PST Action Required: Approve/Reject within notification
  
- **Registration Approved** (to User)
  - Trigger: PST member or Admin approves registration
  - Recipients: Registered user
  - Priority: High
  - Include: Approved by (President/Secretary/Treasurer/Admin name)
  
- **Registration Rejected** (to User)
  - Trigger: PST member or Admin rejects registration
  - Recipients: Registered user
  - Priority: High
  - Include: Rejection reason and which PST member rejected

#### 2. Ownership Transfer Notifications
- **Transfer Request Submitted** (to PST Committee)
  - Trigger: Owner initiates ownership transfer
  - Recipients: All three PST committee members (President, Secretary, Treasurer)
  - Priority: Critical
  - Include: Transfer details, apartment info, ownership percentage
  - Action: Approve/Reject buttons within notification
  
- **Transfer Approved/Rejected** (to involved parties)
  - Trigger: PST member makes decision on transfer
  - Recipients: Both transferor and transferee
  - Priority: High
  - Include: Which PST member (President/Secretary/Treasurer) made the decision

#### 3. Security & Password Notifications
- **Password Change Required** (to User)
  - Trigger: First login with default password
  - Recipients: User
  - Priority: Critical
  
- **Weak Password Warning** (to User)
  - Trigger: System detects weak password
  - Display: Navbar warning banner
  - Priority: Medium
  
- **Password Changed Successfully** (to User)
  - Trigger: User changes password
  - Recipients: User
  - Priority: Low

#### 4. System Announcements
- **Maintenance Alerts** (to All Users)
  - Sent by: Admin or PST Committee
  - Priority: High
  
- **Billing Alerts** (to Owners)
  - Sent by: Treasurer or Admin
  - Priority: High
  
- **System Updates** (to All Users)
  - Sent by: Admin
  - Priority: Medium
  
- **Community Notices** (to All Users)
  - Sent by: PST Committee or Admin
  - Priority: Medium
  
- **Security Alerts** (to All Users)
  - Sent by: Admin or PST Committee
  - Priority: Critical

#### 5. Lease Management Notifications
- **Lease Expiration Reminder** (to Tenant & Owner)
  - Trigger: 30 days before lease end date
  - Recipients: Tenant and apartment owner(s)
  - Priority: High
  - Follow-up: 15 days, 7 days, 1 day before expiration
  - CC: Secretary (for tracking)

#### 6. Role Assignment Notifications
- **New Role Assigned** (to User)
  - Trigger: Admin or PST member assigns additional role
  - Recipients: User receiving new role
  - Priority: Medium
  - Include: Assigned by (name and role)

#### 7. PST-Specific Notifications
- **Pending Approval Queue Alert** (to PST Committee)
  - Trigger: Requests pending for more than 24 hours
  - Recipients: All PST members
  - Priority: High
  
- **Emergency Decision Required** (to PST Committee)
  - Trigger: Admin escalates urgent matter
  - Recipients: President, Secretary, Treasurer
  - Priority: Critical

---

## Business Rules & Validation Logic

### Role Assignment Rules

#### Permission Hierarchy
- **Level 100 (Super Admin):** Full system access, can assign any role
- **Level 90 (Admin):** Cannot assign roles above Level 80
- **Level 80 (PST Committee - President/Secretary/Treasurer):** Can approve registrations, transfers, and critical decisions instantly
- **Level 50 (Owner):** Can manage own apartments
- **Level 30 (Tenant):** Limited to own profile
- **Level 10 (Resident):** Read-only access

#### PST Committee Special Permissions
1. **Instant Approval Authority:**
   - Any single PST member can approve user registrations
   - Any single PST member can approve ownership transfers
   - PST members cannot approve their own requests
   - All PST approvals logged with member identity

2. **Lease Period Modification:**
   - PST Committee can edit tenant lease end dates
   - Can extend or reduce lease periods per apartment
   - All modifications logged with reason
   - Affected parties notified automatically

3. **Emergency Override:**
   - PST Committee can override standard workflows in emergencies
   - Must provide reason for override
   - Complete audit trail maintained
   - Admin notified of all overrides

#### Assignment Rules
1. **Bulk Operations Available:**
   - Efficient management of multiple user roles
   - CSV import support for bulk assignments
   - Transaction-safe operations with rollback protection

2. **Hierarchical Enforcement:**
   - Multiple validation layers prevent privilege escalation
   - Admins cannot assign roles they don't possess
   - PST members can assign roles up to Level 80
   - System validates all role assignments before commit

3. **Role Conflict Resolution:**
   - User with multiple roles: use highest privilege level
   - Example: User who is both Owner (Level 50) and Secretary (Level 80) operates at Level 80
   - Dashboard shows all roles with ability to switch context

4. **Transaction Safety:**
   - All role assignments wrapped in database transactions
   - Automatic rollback on validation failure
   - Audit logging for all role changes

### Data Validation Requirements

#### User Data Validation
1. **Mobile Number:**
   - Format: 8-15 digits, numeric only
   - Uniqueness: Enforced globally across all users
   - Validation: Real-time check during registration
   - Change verification: OTP required (future implementation)

2. **Email Address:**
   - Format: Valid email format per RFC 5322
   - Uniqueness: Optional (configurable by admin)
   - Verification: Email verification required after registration
   - Change verification: Confirmation email (future implementation)

3. **Password:**
   - Minimum length: 6 characters
   - Requirements: Alphanumeric + special symbols
   - Strength check: Real-time feedback during creation
   - History: Cannot reuse last 3 passwords (future)

#### Apartment Data Validation
1. **Apartment Uniqueness:**
   - Combination of floor + unit_type + unit_number must be unique
   - Validation: Database constraint + application-level check
   - **Display Order: Always floor ASC, then type ASC**

2. **Occupancy Limits:**
   - Maximum 2 active owners per apartment
   - Maximum 2 active tenants per apartment
   - System prevents exceeding these limits

3. **Ownership Share Validation:**
   - Total ownership percentage must equal 100% per apartment
   - Each owner must have share between 1-100%
   - Validation occurs during transfer and new owner assignment

4. **Square Footage:**
   - Required for maintenance calculations
   - Format: Decimal (e.g., 1450.50)
   - Validation: Must be positive number

#### Tenant Lease Validation
1. **Lease Period:**
   - Default: 11 months from start date
   - Minimum: 1 month
   - Maximum: 24 months (configurable)
   - **PST Committee can edit lease end date per apartment**

2. **Lease Dates:**
   - Start date cannot be in the past
   - End date must be after start date
   - System calculates default end date automatically

3. **Auto-Renewal:**
   - Optional flag for automatic lease renewal
   - Requires owner approval (future implementation)

### Profile Management Rules

#### Self-Service Editing
Users can edit the following fields themselves:
- Full name
- Mobile number (verification required)
- Email address (verification required)
- Profession
- Alternate contact number
- Emergency contacts
- Vehicle information
- Profile photo

#### Admin & PST Override
Admins and PST Committee members can edit any user field with:
- Reason/comment required
- Complete audit trail logged
- Notification sent to affected user
- Override authority logged (Admin vs President vs Secretary vs Treasurer)

#### Audit Logging
All profile changes must log:
- Field changed
- Old value
- New value
- User who made change (including PST member role if applicable)
- Timestamp
- IP address
- Reason (if admin/PST override)

### Ownership Transfer Rules

#### Transfer Requirements
1. **PST Committee Approval Required:**
   - All ownership transfers must be approved by PST Committee
   - Any one PST member (President, Secretary, or Treasurer) can approve
   - Cannot be self-approved even by PST members
   - PST member who approves is logged in system

2. **Transfer Process:**
   - Transferor initiates request
   - System validates ownership percentage
   - Request sent to all three PST committee members simultaneously
   - First PST member to review can approve/reject
   - Once one PST member decides, request is closed
   - Both parties notified of decision with PST member identity

3. **Audit Trail:**
   - Complete history of transfer request
   - Which PST member (President/Secretary/Treasurer) approved/rejected
   - Approval/rejection reasons logged
   - Document uploads supported (future)
   - Date of actual ownership change recorded

4. **Validation Checks:**
   - Transferor must have active ownership
   - Cannot transfer more than owned percentage
   - Transferee must be existing user or new registration
   - Total ownership must remain 100%

---

## Database Schema

### Core Tables

#### apartments
```
- id (Primary Key)
- floor_number (Integer, indexed for sorting)
- unit_type (VARCHAR, indexed for sorting)
- unit_number (VARCHAR)
- square_footage (Decimal) - for maintenance calculations
- building_name (VARCHAR, optional)
- is_active (Boolean, default: true)
- created_at (Timestamp)
- updated_at (Timestamp)

UNIQUE CONSTRAINT: (floor_number, unit_type, unit_number)
INDEX: (floor_number ASC, unit_type ASC) - CRITICAL for proper ordering
```

#### users
```
- id (Primary Key)
- full_name (VARCHAR, required)
- email (VARCHAR, indexed)
- mobile_number (VARCHAR, unique, required)
- profession_id (Foreign Key → professions.id)
- alternate_contact (VARCHAR, optional)
- emergency_contact_name (VARCHAR, optional)
- emergency_contact_number (VARCHAR, optional)
- vehicle_info (TEXT, optional)
- profile_photo_url (VARCHAR, optional)
- password_hash (VARCHAR, required)
- must_reset_password (Boolean, default: true)
- is_active (Boolean, default: true)
- email_verified (Boolean, default: false)
- mobile_verified (Boolean, default: false)
- created_at (Timestamp)
- updated_at (Timestamp)
- last_login_at (Timestamp)

INDEX: (email), (mobile_number)
```

#### roles
```
- id (Primary Key)
- role_name (VARCHAR, unique)
- permission_level (Integer)
- description (TEXT)
- is_active (Boolean, default: true)
- created_at (Timestamp)
- updated_at (Timestamp)

PREDEFINED ROLES:
- Super Admin (Level 100)
- Admin (Level 90)
- President (Level 80) - PST Committee Member
- Secretary (Level 80) - PST Committee Member
- Treasurer (Level 80) - PST Committee Member
- Owner (Level 50)
- Tenant (Level 30)
- Resident (Level 10)

INDEX: (permission_level), (role_name)
```

#### professions
```
- id (Primary Key)
- name (VARCHAR, unique, required)
- is_custom (Boolean, default: false)
- is_active (Boolean, default: true)
- created_at (Timestamp)
- updated_at (Timestamp)

INDEX: (name), (is_active)
```

#### parking_slots
```
- id (Primary Key)
- slot_number (Integer, 1-200, unique, required)
- apartment_id (Foreign Key → apartments.id, nullable)
- assigned_to_user_id (Foreign Key → users.id, nullable)
- vehicle_info (VARCHAR, optional)
- assignment_date (Date, nullable)
- assigned_by_user_id (Foreign Key → users.id) - Admin or PST member
- is_active (Boolean, default: true)
- created_at (Timestamp)
- updated_at (Timestamp)

INDEX: (slot_number), (apartment_id), (assigned_to_user_id)
CONSTRAINT: slot_number BETWEEN 1 AND 200
```

#### user_roles
```
- id (Primary Key)
- user_id (Foreign Key → users.id)
- role_id (Foreign Key → roles.id)
- apartment_id (Foreign Key → apartments.id, nullable)
- is_active (Boolean, default: true)
- assigned_by_user_id (Foreign Key → users.id)
- assigned_at (Timestamp)
- deactivated_at (Timestamp, nullable)

INDEX: (user_id, apartment_id), (role_id)
UNIQUE CONSTRAINT: (user_id, role_id, apartment_id) WHERE is_active = true
```

#### ownership_relationships
```
- id (Primary Key)
- user_id (Foreign Key → users.id)
- apartment_id (Foreign Key → apartments.id)
- ownership_percentage (Decimal, 0-100)
- start_date (Date)
- end_date (Date, nullable)
- is_active (Boolean, default: true)
- approved_by_user_id (Foreign Key → users.id) - Admin or PST member
- approved_by_role (VARCHAR) - 'Admin', 'President', 'Secretary', 'Treasurer'
- approved_at (Timestamp)
- created_at (Timestamp)
- updated_at (Timestamp)

INDEX: (user_id), (apartment_id), (is_active)
CONSTRAINT: ownership_percentage BETWEEN 0 AND 100
```

#### tenant_relationships
```
- id (Primary Key)
- user_id (Foreign Key → users.id)
- apartment_id (Foreign Key → apartments.id)
- lease_start_date (Date, required)
- lease_end_date (Date, required) - default +11 months, PST-editable
- is_auto_renew (Boolean, default: false)
- is_active (Boolean, default: true)
- approved_by_user_id (Foreign Key → users.id) - Admin or PST member
- approved_by_role (VARCHAR) - 'Admin', 'President', 'Secretary', 'Treasurer'
- approved_at (Timestamp)
- modified_by_pst (Boolean, default: false) - flag if PST modified lease period
- created_at (Timestamp)
- updated_at (Timestamp)

INDEX: (user_id), (apartment_id), (lease_end_date), (is_active)
```

#### ownership_transfers
```
- id (Primary Key)
- apartment_id (Foreign Key → apartments.id)
- from_user_id (Foreign Key → users.id)
- to_user_id (Foreign Key → users.id)
- ownership_percentage (Decimal)
- request_date (Timestamp)
- status (ENUM: 'pending', 'approved', 'rejected')
- approved_by_user_id (Foreign Key → users.id, nullable) - PST member
- approved_by_role (VARCHAR, nullable) - 'President', 'Secretary', 'Treasurer'
- approval_date (Timestamp, nullable)
- rejection_reason (TEXT, nullable)
- transfer_completion_date (Date, nullable)
- created_at (Timestamp)
- updated_at (Timestamp)

INDEX: (status), (apartment_id), (from_user_id), (to_user_id)
NOTE: Only PST Committee members can approve transfers
```

#### notifications
```
- id (Primary Key)
- user_id (Foreign Key → users.id)
- notification_type (VARCHAR, indexed)
- title (VARCHAR, required)
- message (TEXT, required)
- link_url (VARCHAR, optional)
- is_read (Boolean, default: false)
- priority (ENUM: 'low', 'medium', 'high', 'critical')
- sent_by_user_id (Foreign Key → users.id, nullable) - if sent by PST/Admin
- sent_by_role (VARCHAR, nullable) - role of sender
- created_at (Timestamp)
- read_at (Timestamp, nullable)

INDEX: (user_id, is_read), (notification_type), (created_at DESC), (priority)
```

#### pst_committee_actions
```
- id (Primary Key)
- pst_member_user_id (Foreign Key → users.id)
- pst_role (ENUM: 'President', 'Secretary', 'Treasurer')
- action_type (VARCHAR) - 'approval', 'rejection', 'override', 'modification'
- target_table (VARCHAR) - which table was affected
- target_record_id (Integer) - which record was affected
- action_details (JSON) - details of the action
- reason (TEXT, optional)
- created_at (Timestamp)

INDEX: (pst_member_user_id), (action_type), (created_at DESC)
PURPOSE: Special audit log for all PST Committee actions
```

#### audit_logs
```
- id (Primary Key)
- user_id (Foreign Key → users.id)
- action (VARCHAR, required)
- table_name (VARCHAR, required)
- record_id (Integer, required)
- old_value (JSON, nullable)
- new_value (JSON, nullable)
- ip_address (VARCHAR)
- user_agent (TEXT)
- user_role (VARCHAR) - role at time of action
- reason (TEXT, nullable)
- created_at (Timestamp)

INDEX: (user_id), (table_name, record_id), (created_at DESC)
```

---

## Migration & Deployment Strategy

### Existing User Migration (70+ Users)

#### Pre-Migration Tasks
1. **Data Audit:**
   - Verify all existing user records
   - Check apartment associations
   - Validate role assignments
   - **Identify PST Committee members (President, Secretary, Treasurer)**
   - Identify any data inconsistencies

2. **Backup Creation:**
   - Full database backup before migration
   - Export to multiple formats (SQL, CSV)
   - Store in secure offsite location

#### Migration Process
1. **Bulk User Migration:**
   - All existing users migrated with is_active = true
   - Default temporary password generated for each user
   - must_reset_password flag set to true
   - Email sent with password reset instructions

2. **PST Committee Setup:**
   - **Identify and assign President role (Level 80)**
   - **Identify and assign Secretary role (Level 80)**
   - **Identify and assign Treasurer role (Level 80)**
   - Configure special permissions for PST members
   - Set up PST notification preferences

3. **Approval Records:**
   - Create dummy approval records for existing users
   - Set approved_by_user_id to system admin
   - Set approval_date to migration date
   - Add migration note in audit logs

4. **Role Preservation:**
   - All existing role assignments preserved
   - Multiple roles maintained if applicable
   - Apartment associations verified and linked

5. **Apartment Association:**
   - Verify all apartment records exist
   - **Ensure floor and type fields populated for proper sorting**
   - Create missing apartment records if needed
   - Link users to apartments via relationships tables

#### Post-Migration Validation
1. **User Login Testing:**
   - Verify all users can login
   - Check password reset flow
   - Validate role-based access
   - **Test PST Committee member access and permissions**

2. **Data Integrity Checks:**
   - Verify all relationships intact
   - Check ownership percentages sum to 100%
   - Validate apartment listing order (floor ASC, type ASC)
   - Confirm notification system working
   - **Verify PST members receive priority notifications**

3. **User Communication:**
   - Send welcome email to all users
   - **Send special welcome email to PST Committee members with their enhanced permissions**
   - Provide system guide and documentation
   - Announce support channels for issues

### Production Deployment

#### Infrastructure Setup
1. **Domain Configuration:**
   - Domain: dddp.online
   - DNS configuration and propagation
   - Subdomain setup if needed

2. **SSL Certificate:**
   - Let's Encrypt or commercial SSL
   - Auto-renewal configuration
   - HTTPS enforcement

3. **Server Configuration:**
   - Web server (Nginx/Apache)
   - Application server (based on stack)
   - Database server with replication
   - Redis/Memcached for caching

#### Database Configuration
1. **Performance Optimization:**
   - Proper indexing (especially for apartment ordering)
   - Query optimization
   - Connection pooling
   - Regular maintenance schedules

2. **Backup Systems:**
   - Automated daily backups
   - Incremental backups every 6 hours
   - Off-site backup storage
   - Backup restoration testing monthly

3. **Monitoring:**
   - Database performance monitoring
   - Query performance tracking
   - Slow query logging and alerts
   - Disk space monitoring

#### Application Deployment
1. **Environment Configuration:**
   - Production environment variables
   - API keys and secrets management
   - Email service configuration
   - File storage configuration

2. **Performance Testing:**
   - Load testing with simulated 100+ concurrent users
   - Stress testing to identify breaking points
   - Database query performance under load
   - Response time monitoring
   - **PST notification delivery speed testing**

3. **Security Measures:**
   - Firewall configuration
   - DDoS protection
   - Rate limiting implementation
   - Security headers configuration
   - Regular security audits

#### Rollback Procedures
1. **Rollback Plan:**
   - Database snapshot before deployment
   - Application version control
   - Quick rollback scripts prepared
   - Rollback testing in staging

2. **Emergency Recovery:**
   - 24/7 emergency contact list (including PST Committee members)
   - Incident response procedures
   - Data recovery procedures
   - Communication plan for users

---

## Success Metrics & Validation Criteria

### Functional Requirements

#### User Management
- **Registration Completion Rate:** Target 95%
  - Measure: Completed registrations / Started registrations
  - Track: Drop-off points in registration flow
  
- **Approval Turnaround Time:** Target < 12 hours
  - Measure: Time from registration to PST/Admin approval decision
  - Track: Average, median, and outliers
  - **PST Committee target: < 6 hours for critical requests**

- **Role Assignment Accuracy:** Target 100%
  - Measure: Correct role assignments / Total assignments
  - Audit: Weekly review of role assignments

#### PST Committee Efficiency
- **PST Response Time:** Target < 6 hours for critical decisions
  - Measure: Time from notification to PST action
  - Track: Individual PST member response times
  
- **PST Decision Rate:** Track which decisions are made by President vs Secretary vs Treasurer
  - Monitor: Distribution of approvals among PST members
  - Goal: Ensure no single member is overburdened

#### Access Control
- **Role-Based Access Control Effectiveness:** Target 100%
  - Test: Unauthorized access attempts should be blocked
  - Audit: Monthly security audit of access logs
  - **Verify PST Committee special permissions work correctly**

- **Password Reset Success Rate:** Target 98%
  - Measure: Successful resets / Reset attempts
  - Track: Common failure reasons

#### Apartment Management
- **Apartment Data Accuracy:** Target 100%
  - Verify: All apartments in system match physical apartments
  - Check: Square footage and details correct
  - **Validate: Apartment listing order (floor ASC, type ASC) everywhere**

- **Ownership Share Accuracy:** Target 100%
  - Validate: All apartments have ownership totaling exactly 100%
  - Audit: Weekly automated validation

#### Dashboard Performance
- **Page Load Time:** Target < 2 seconds
  - Measure: Time to interactive for dashboard pages
  - Track: 95th percentile load times
  - **PST Dashboard: Target < 1.5 seconds for priority queue**

- **Role Switching Time:** Target < 1 second
  - Measure: Time to switch between roles and refresh dashboard
  - Track: User feedback on switching experience

- **Apartment List Loading:** Target < 1 second
  - **Critical: Measure ordered list generation and display time**
  - Track: Performance with 200+ apartments

#### Parking Management
- **Parking Assignment Efficiency:** Target < 5 minutes per assignment
  - Measure: Time for admin to assign parking slot
  - Track: User satisfaction with parking features

- **Parking Slot Utilization:** Track actual usage
  - Monitor: Assigned vs available slots
  - Report: Monthly utilization statistics

#### Ownership Transfers
- **Transfer Workflow Completion Rate:** Target 90%
  - Measure: Completed transfers / Initiated transfers
  - Track: Reasons for incomplete transfers

- **Transfer Approval Time:** Target < 24 hours
  - Measure: Time from request to PST Committee decision
  - Track: Average and outliers
  - **PST target: < 12 hours for standard transfers**

### User Experience Metrics

#### User Satisfaction
- **Overall Satisfaction Score:** Target 4.5/5
  - Method: Quarterly user surveys
  - Categories: Ease of use, feature completeness, performance

- **Dashboard Interface Rating:** Target 4.5/5
  - Survey: Rate dashboard layout and navigation
  - Track: Specific pain points and suggestions
  - **PST Dashboard Rating:** Target 4.7/5

- **Mobile Experience Rating:** Target 4.0/5
  - Survey: Mobile usability feedback
  - Track: Mobile-specific issues

#### Administrative Efficiency
- **Time Savings vs Manual Process:** Target 50% reduction
  - Measure: Time to complete common admin tasks
  - Compare: Pre-system vs post-system timings

- **Approval Workflow Efficiency:** Target 60% reduction in time
  - Measure: Time to process approvals
  - Track: Bottlenecks in workflow
  - **PST efficiency improvement:** Target 70% reduction

- **Bulk Operation Usage:** Target 70% of admins using
  - Track: CSV import usage statistics
  - Measure: Time saved per bulk operation

#### System Reliability
- **System Uptime:** Target 99.5%
  - Monitor: Continuous availability monitoring
  - Alert: Immediate notification on downtime
  - **PST notification system uptime:** Target 99.9%

- **Error Rate:** Target < 0.1% of requests
  - Track: Application errors and exceptions
  - Monitor: Error patterns and common issues

- **Response Time:** Target 95% of requests < 2 seconds
  - Monitor: API and page response times
  - Alert: Performance degradation warnings

#### Mobile Responsiveness
- **Mobile Compatibility:** Target 100% feature parity
  - Test: All features work on mobile devices
  - Devices: iOS and Android, multiple screen sizes

- **Mobile Load Time:** Target < 3 seconds
  - Measure: Page load on 4G connection
  - Optimize: Image and asset loading

#### Cross-Browser Compatibility
- **Browser Support:** Chrome, Firefox, Safari, Edge
  - Test: All features in each browser
  - Track: Browser-specific issues

- **Compatibility Issues:** Target < 5 issues per browser
  - Monitor: User-reported browser problems
  - Resolve: Within 48 hours of report

---

## Quality Assurance & Testing

### Testing Requirements

#### Approval Workflow Testing
- Test all approval paths (approval, rejection, timeout)
- Verify notification triggers at each step
- Test concurrent approval requests
- Validate ownership transfer approval flow
- **Test PST Committee approval mechanism (any single member can approve)**
- **Verify PST member cannot approve own requests**
- **Test notification routing to all three PST members simultaneously**

#### Role-Based Access Control Testing
- Test each role's access permissions
- Verify role hierarchy enforcement
- Test admin restrictions (Level 90 cannot assign > Level 80)
- **Test PST Committee special permissions (Level 80)**
- **Verify President, Secretary, and Treasurer have identical permission levels**
- Test role switching functionality
- Validate multi-role scenarios

#### PST Committee Specific Testing
- **Test instant approval capability for all three PST roles**
- **Verify PST priority notification delivery**
- **Test PST dashboard with pending request queue**
- **Validate conflict of interest prevention (self-approval blocking)**
- **Test lease period modification by PST members**
- **Verify PST action audit logging**
- **Test emergency override functionality**

#### Mobile Responsiveness Testing
- Test on iOS devices (iPhone 12+, iPad)
- Test on Android devices (various manufacturers)
- Test different screen sizes (320px to 1920px)
- Verify touch interactions work properly
- Test landscape and portrait orientations
- **Test PST mobile notifications on all devices**

#### Security Testing
- Penetration testing for vulnerabilities
- SQL injection prevention testing
- XSS (Cross-Site Scripting) prevention
- CSRF (Cross-Site Request Forgery) protection
- Session hijacking prevention
- Password strength enforcement testing
- **PST Committee privilege escalation testing**

#### Parking Management Testing
- Test slot assignment and de-assignment
- Verify slot availability tracking
- Test conflict prevention (double-assignment)
- Validate slot number range (1-200)
- Test search and filter functionality

#### Apartment Ordering Testing (CRITICAL)
- **Verify all dropdowns show apartments in floor ASC, type ASC order**
- **Test ordering with mixed floor numbers (1, 2, 10, 13, 14)**
- **Validate sorting across all interfaces (admin, user, PST, reports)**
- **Test CSV export maintains proper ordering**
- **Verify API responses return ordered lists**

#### Profession Management Testing
- Test predefined profession selection
- Test "Other" option with custom input
- Verify custom professions save to database
- Test profession editing and updates

---

## Final Implementation Notes

### Critical Path Items

**Priority 1 (Must Have for Launch):**
1. Apartment-centric data model implementation
2. **Global apartment ordering logic (floor ASC, type ASC)**
3. Multiple role assignment and switching system
4. **PST Committee role setup and special permissions**
5. Approval workflow automation (registration + ownership transfers)
6. **PST instant decision-making capability**
7. Password enforcement and security features

**Priority 2 (Important for Full Functionality):**
8. Parking management system implementation
9. Profession table and user association system
10. In-app notification system with PST priority routing
11. CSV import/export functionality
12. Audit logging system
13. **PST Committee action tracking and audit trail**

**Priority 3 (Enhanced Features):**
14. Email notification integration (especially for PST)
15. Advanced reporting and analytics
16. Mobile app development
17. SMS notification system (priority for PST members)
18. Document upload and management

### Stakeholder Review Required

#### Pre-Development Approval Needed:
- Dashboard content and layout designs
- **PST Committee dashboard design and priority queue interface**
- Notification content templates and timing
- **PST notification priority rules and escalation procedures**
- Approval workflow escalation procedures
- Emergency access and recovery processes
- **Default profession list for dropdown selection**
- **Parking slot allocation and management policies**
- **PST Committee decision-making protocols**

#### Post-Development Review Needed:
- User acceptance testing results
- **PST Committee workflow testing results**
- Performance and load test results
- Security audit findings
- Mobile responsiveness verification
- Production deployment checklist
- **PST emergency override procedures validation**

### Technical Debt & Future Enhancements

#### Known Technical Debt:
- OTP verification for mobile/email (planned for Phase 4)
- SMS notification system (planned for Phase 4, priority for PST)
- Document upload for ownership transfers
- Advanced analytics and reporting dashboard
- Mobile native apps (iOS/Android)
- **Multi-factor authentication for PST Committee members**

#### Future Enhancement Roadmap:
- **Quarter 1:** SMS notifications (priority for PST), OTP verification
- **Quarter 2:** Advanced reporting, analytics dashboard, PST analytics
- **Quarter 3:** Mobile native apps development
- **Quarter 4:** Integration with external services (payment gateway, etc.)
- **Future:** AI-powered decision support for PST Committee

---

## PST Committee Dashboard Specifications

### Dashboard Layout

#### Priority Request Queue (Top Section)
- **Pending Registrations** (sorted by urgency)
  - Show: User name, apartment, requested role, waiting time
  - Actions: Quick Approve/Reject buttons
  - Highlight: Requests > 24 hours old in red
  
- **Pending Ownership Transfers** (critical section)
  - Show: From user, to user, apartment, ownership %, waiting time
  - Actions: Quick Approve/Reject with comment field
  - Highlight: Urgent transfers

- **Tenant Lease Modifications** (if any pending)
  - Show: Tenant, apartment, current end date, requested change
  - Actions: Approve modification

#### Statistics Panel (Middle Section)
- Requests handled today/this week/this month
- Average response time
- Pending items count
- Recent actions by role (President/Secretary/Treasurer)

#### Recent Actions (Bottom Section)
- Last 10 actions taken by this PST member
- Last 10 actions taken by other PST members
- Filter by action type

#### Quick Actions Sidebar
- Send Community Announcement
- Create System Alert
- View All Apartments (ordered by floor, type)
- View All Users
- Generate Reports

### PST Member Identification Badge
- Display role badge (President/Secretary/Treasurer) on navbar
- Color-coded badges:
  - President: Gold badge
  - Secretary: Blue badge
  - Treasurer: Green badge
- Shows special permissions indicator

---

## Appendix

### Glossary of Terms
- **PST Committee:** President-Secretary-Treasurer Committee - High-power decision-making body consisting of three elected positions (President, Secretary, Treasurer) with Level 80 permissions for instant critical decisions
- **President:** Chief decision maker and community leader (PST Committee member)
- **Secretary:** Administrative head and communication coordinator (PST Committee member)
- **Treasurer:** Financial head and budget manager (PST Committee member)
- **OTP:** One-Time Password
- **CSV:** Comma-Separated Values
- **RBAC:** Role-Based Access Control
- **SSL:** Secure Sockets Layer
- **API:** Application Programming Interface

### PST Committee Operational Guidelines

#### Decision Making Protocol
1. **Standard Requests (Registrations, Role Assignments):**
   - Any single PST member can approve
   - First to respond handles the request
   - Other PST members automatically notified of decision

2. **Critical Decisions (Ownership Transfers, Major Policy Changes):**
   - Ideally requires consensus among PST members
   - Any single member can approve in urgent situations
   - Complete audit trail maintained

3. **Emergency Situations:**
   - PST members have override authority
   - Must document reason for override
   - Admin team notified automatically

#### Communication Channels
- **Internal PST Group:** For coordination among PST members
- **PST to Admin:** For escalation and technical support
- **PST to Community:** For announcements and updates

#### Conflict Resolution
- If PST members disagree, majority vote prevails
- If tied (not possible with 3 members), escalate to full committee meeting
- Document all disagreements and resolutions

### Contact Information
- **Development Team Lead:** [To be assigned]
- **Project Manager:** [To be assigned]
- **PST Committee Contacts:**
  - President: [To be assigned]
  - Secretary: [To be assigned]
  - Treasurer: [To be assigned]
- **Emergency Support:** [To be assigned]
- **Technical Support Email:** support@dddp.online
- **Admin Email:** admin@dddp.online

### Document Change Log
- **Version 1.0:** Initial specification (dddesignv1.md)
- **Version 2.0:** Enhanced features added (dddesignv12.md)
- **Version 3.0:** Consolidated specification with PST Committee details
  - Added PST Committee organizational structure
  - Defined PST member roles and permissions
  - Added PST-specific notifications and workflows
  - Enhanced approval workflows with PST integration
  - Added PST dashboard specifications
  - Included PST operational guidelines

---

## Implementation Checklist

### Phase 1 Checklist (Weeks 1-2)
- [ ] Database schema created with all tables
- [ ] Apartment ordering indexes created (floor ASC, type ASC)
- [ ] User authentication system implemented
- [ ] Password hashing configured
- [ ] User registration form created with all fields
- [ ] Profession table populated with default values
- [ ] Profile editing interface completed
- [ ] Role-based routing implemented
- [ ] Parking slots table created (1-200)

### Phase 2 Checklist (Weeks 3-4)
- [ ] PST Committee roles created (President, Secretary, Treasurer)
- [ ] Role assignment system completed
- [ ] Multiple role switching implemented
- [ ] Owner dashboard with apartment list (properly ordered)
- [ ] PST Committee dashboard created with priority queue
- [ ] Registration approval workflow implemented
- [ ] Ownership transfer workflow implemented
- [ ] PST instant approval capability tested
- [ ] CSV import functionality completed
- [ ] In-app notification system working
- [ ] PST priority notifications configured

### Phase 3 Checklist (Weeks 5-6)
- [ ] Password enforcement system completed
- [ ] Force password reset on first login working
- [ ] Email notification integration completed
- [ ] PST email notifications tested
- [ ] Security audit logging implemented
- [ ] PST action audit trail verified
- [ ] Dashboard card system completed
- [ ] Mobile responsiveness tested on all devices
- [ ] Performance optimization completed
- [ ] PST dashboard performance verified

### Pre-Launch Checklist
- [ ] All 70+ existing users migrated successfully
- [ ] PST Committee members identified and roles assigned
- [ ] All apartments properly ordered in all interfaces
- [ ] Ownership percentages validated (all sum to 100%)
- [ ] Security audit completed and passed
- [ ] Performance testing completed
- [ ] PST workflow testing completed and approved
- [ ] User documentation prepared
- [ ] PST Committee operational guidelines finalized
- [ ] Support team trained
- [ ] Backup and recovery procedures tested
- [ ] Domain SSL certificate installed
- [ ] Production environment configured
- [ ] Rollback procedures documented and tested

---

*Document Version: 3.0 (Consolidated with PST Details)*  
*Last Updated: November 8, 2025*  
*Project: DD Diamond Park Apartment Management System*  
*Confidential: For Development Team Use Only*

**Key Enhancement in Version 3.0:**  
Complete integration of PST (President-Secretary-Treasurer) Committee structure, roles, permissions, workflows, and operational guidelines throughout the entire specification document.