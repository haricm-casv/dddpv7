# Security Implementation Plan

## Overview

**Security Framework:** Defense in depth approach
**Authentication:** JWT with refresh tokens
**Authorization:** Role-based access control (RBAC) with PST special permissions
**Data Protection:** Encryption, input validation, and secure coding practices

## Authentication System

### 1. JWT Token Implementation

#### Token Structure
```javascript
// Access Token Payload
{
  "user_id": 1,
  "email": "user@dddp.online",
  "roles": ["Owner", "Secretary"],
  "current_role": "Owner",
  "permissions": ["read_profile", "manage_own_apartments"],
  "iat": 1640995200,
  "exp": 1640998800, // 1 hour
  "iss": "dddp.online",
  "aud": "dddp-api"
}

// Refresh Token Payload
{
  "user_id": 1,
  "token_type": "refresh",
  "iat": 1640995200,
  "exp": 1643587200, // 30 days
  "iss": "dddp.online"
}
```

#### Token Generation
```javascript
const jwt = require('jsonwebtoken');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      user_id: user.id,
      email: user.email,
      roles: user.roles,
      current_role: user.current_role,
      permissions: getPermissions(user.current_role),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      iss: 'dddp.online',
      aud: 'dddp-api'
    },
    process.env.JWT_SECRET
  );

  const refreshToken = jwt.sign(
    {
      user_id: user.id,
      token_type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    },
    process.env.JWT_REFRESH_SECRET
  );

  return { accessToken, refreshToken };
};
```

### 2. Password Security

#### Password Requirements
- **Minimum Length:** 6 characters
- **Complexity:** Must contain alphanumeric + special characters
- **History:** Cannot reuse last 3 passwords (future implementation)
- **Strength Indicator:** Real-time feedback during creation

#### Password Hashing
```javascript
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const saltRounds = 12; // High security for production
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

#### Password Validation
```javascript
const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return {
      valid: false,
      message: 'Password must contain uppercase, lowercase, numbers, and special characters'
    };
  }

  return { valid: true };
};
```

## Authorization System

### 1. Role-Based Access Control (RBAC)

#### Permission Hierarchy
```javascript
const PERMISSIONS = {
  // Super Admin (Level 100)
  SUPER_ADMIN: [
    'manage_system',
    'assign_any_role',
    'view_all_audit_logs',
    'system_configuration'
  ],

  // Admin (Level 90)
  ADMIN: [
    'manage_users',
    'assign_roles_up_to_80',
    'view_audit_logs',
    'system_monitoring',
    'bulk_operations'
  ],

  // PST Committee (Level 80)
  PST_COMMITTEE: [
    'approve_registrations',
    'approve_transfers',
    'modify_lease_periods',
    'emergency_override',
    'view_all_users',
    'send_notifications',
    'manage_approvals'
  ],

  // Owner (Level 50)
  OWNER: [
    'view_own_profile',
    'edit_own_profile',
    'manage_own_apartments',
    'initiate_transfers',
    'view_own_tenants'
  ],

  // Tenant (Level 30)
  TENANT: [
    'view_own_profile',
    'edit_own_profile',
    'view_lease_info'
  ],

  // Resident (Level 10)
  RESIDENT: [
    'view_own_profile',
    'read_only_access'
  ]
};
```

#### Permission Checking Middleware
```javascript
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.permissions) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // Get current role permissions
    const userPermissions = getPermissions(user.current_role);

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
    }

    next();
  };
};

// Usage in routes
app.get('/api/v1/users', authenticateToken, checkPermission('view_all_users'), getUsers);
```

### 2. PST Committee Special Permissions

#### Instant Approval Logic
```javascript
const isPSTMember = (user) => {
  return user.roles.some(role =>
    ['President', 'Secretary', 'Treasurer'].includes(role)
  );
};

const canPSTApprove = (user, targetUserId = null) => {
  // PST members can approve any request except their own
  if (!isPSTMember(user)) return false;

  // Prevent self-approval
  if (targetUserId && user.id === targetUserId) return false;

  return true;
};
```

#### PST Approval Workflow
```javascript
const processPSTApproval = async (requestType, requestData, pstUser) => {
  // Validate PST permissions
  if (!canPSTApprove(pstUser, requestData.user_id)) {
    throw new Error('PST member cannot approve this request');
  }

  // Log PST action
  await logPSTAction({
    pst_member_user_id: pstUser.id,
    pst_role: getPSTRole(pstUser),
    action_type: 'approval',
    target_table: requestType,
    target_record_id: requestData.id,
    action_details: requestData,
    reason: requestData.reason || null
  });

  // Process approval based on type
  switch (requestType) {
    case 'registration':
      return await approveRegistration(requestData.id, pstUser);
    case 'transfer':
      return await approveTransfer(requestData.id, pstUser);
    case 'lease_modification':
      return await modifyLeasePeriod(requestData, pstUser);
    default:
      throw new Error('Unknown request type');
  }
};
```

## Security Middleware

### 1. Authentication Middleware
```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'Access token required' }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' }
        });
      }
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid access token' }
      });
    }

    req.user = decoded;
    next();
  });
};
```

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limits for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  }
});

// File upload limits
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Upload limit exceeded, please try again later.'
    }
  }
});
```

### 3. Input Validation and Sanitization
```javascript
const { body, param, query, validationResult } = require('express-validator');

// Registration validation
const validateRegistration = [
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Full name must be between 2 and 200 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('mobile_number')
    .matches(/^[\+]?[1-9][\d]{8,14}$/)
    .withMessage('Please provide a valid mobile number'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }
    next();
  }
];
```

### 4. Security Headers
```javascript
const helmet = require('helmet');

// Security headers configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.dddp.online"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

## Data Protection

### 1. Database Security
```sql
-- Row Level Security (RLS) for sensitive data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (unless they have admin/PST permissions)
CREATE POLICY users_own_data ON users
  FOR ALL USING (id = current_user_id() OR has_permission('view_all_users'));

-- Audit logging trigger
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_value,
    new_value,
    ip_address,
    user_agent,
    user_role
  ) VALUES (
    current_user_id(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent',
    current_user_role()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 2. File Upload Security
```javascript
const multer = require('multer');
const path = require('path');

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
  }

  if (file.size > maxSize) {
    return cb(new Error('File too large. Maximum size is 2MB.'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});
```

## PST-Specific Security Features

### 1. Conflict of Interest Prevention
```javascript
const preventPSTConflict = (pstUser, targetUserId, apartmentId = null) => {
  // PST members cannot approve their own requests
  if (pstUser.id === targetUserId) {
    return { allowed: false, reason: 'Self-approval not permitted' };
  }

  // Check if PST member has ownership interest in the apartment
  if (apartmentId) {
    const hasOwnership = checkOwnership(pstUser.id, apartmentId);
    if (hasOwnership) {
      return { allowed: false, reason: 'Conflict of interest: ownership in apartment' };
    }
  }

  return { allowed: true };
};
```

### 2. PST Action Auditing
```javascript
const logPSTAction = async (actionData) => {
  await PSTCommitteeAction.create({
    pst_member_user_id: actionData.pst_member_user_id,
    pst_role: actionData.pst_role,
    action_type: actionData.action_type,
    target_table: actionData.target_table,
    target_record_id: actionData.target_record_id,
    action_details: actionData.action_details,
    reason: actionData.reason,
    created_at: new Date()
  });

  // Also log to general audit log
  await AuditLog.create({
    user_id: actionData.pst_member_user_id,
    action: actionData.action_type.toUpperCase(),
    table_name: actionData.target_table,
    record_id: actionData.target_record_id,
    user_role: actionData.pst_role,
    reason: actionData.reason
  });
};
```

## Session Management

### 1. Secure Session Handling
```javascript
// Session configuration (if using express-session)
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  store: new RedisStore({ client: redisClient }) // Redis for session storage
};
```

### 2. Token Blacklisting (for logout)
```javascript
// Simple token blacklist (use Redis in production)
const tokenBlacklist = new Set();

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  // Set expiry for automatic cleanup
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000); // 24 hours
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};
```

## Security Monitoring and Alerting

### 1. Failed Login Tracking
```javascript
const trackFailedLogin = async (email, ipAddress) => {
  // Store failed login attempts
  await FailedLoginAttempt.create({
    email,
    ip_address: ipAddress,
    attempted_at: new Date()
  });

  // Check for brute force attempts
  const recentAttempts = await FailedLoginAttempt.count({
    where: {
      email,
      ip_address: ipAddress,
      attempted_at: {
        [Op.gte]: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      }
    }
  });

  if (recentAttempts >= 5) {
    // Trigger alert or temporary lockout
    await triggerSecurityAlert('BRUTE_FORCE_ATTEMPT', {
      email,
      ip_address: ipAddress,
      attempts: recentAttempts
    });
  }
};
```

### 2. Security Event Logging
```javascript
const logSecurityEvent = async (eventType, details) => {
  await SecurityEvent.create({
    event_type: eventType,
    details: JSON.stringify(details),
    ip_address: details.ip_address,
    user_agent: details.user_agent,
    created_at: new Date()
  });

  // Send alerts for critical security events
  if (['BRUTE_FORCE_ATTEMPT', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH'].includes(eventType)) {
    await sendSecurityAlert(eventType, details);
  }
};
```

## Compliance and Best Practices

### 1. GDPR Compliance
- **Data Minimization:** Only collect necessary user data
- **Consent Management:** Clear consent for data processing
- **Right to Deletion:** User data deletion functionality
- **Data Portability:** Export user data feature

### 2. Security Headers Checklist
- [x] Content Security Policy (CSP)
- [x] HTTP Strict Transport Security (HSTS)
- [x] X-Frame-Options
- [x] X-Content-Type-Options
- [x] Referrer-Policy
- [x] X-XSS-Protection

### 3. Regular Security Audits
- **Dependency Scanning:** Regular npm audit
- **Vulnerability Testing:** Periodic penetration testing
- **Code Reviews:** Security-focused code reviews
- **Access Reviews:** Regular permission audits

This security implementation provides comprehensive protection for the DD Diamond Park Apartment Management System, ensuring user data safety, preventing unauthorized access, and maintaining audit trails for all critical operations, especially PST Committee actions.