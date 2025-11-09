# API Endpoints and Data Flow Design

## Overview

**Base URL:** `/api/v1`
**Authentication:** JWT Bearer Token (Authorization: Bearer <token>)
**Content-Type:** application/json
**Rate Limiting:** 100 requests per 15 minutes per IP

## Authentication Endpoints

### POST /api/v1/auth/login
**Login user and return JWT tokens**
```json
Request:
{
  "email": "user@dddp.online",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "user@dddp.online",
      "roles": ["Owner", "Secretary"],
      "current_role": "Owner"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
      "expires_in": 86400
    }
  }
}
```

### POST /api/v1/auth/register
**Register new user**
```json
Request:
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "mobile_number": "+1234567890",
  "profession_id": 1,
  "apartment_id": 101,
  "primary_role": "Owner",
  "lease_start_date": "2025-01-01", // if tenant
  "lease_end_date": "2025-12-31",   // if tenant
  "password": "SecurePass123!",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_number": "+1234567891"
}

Response (201):
{
  "success": true,
  "message": "Registration submitted for approval",
  "data": {
    "user_id": 123,
    "status": "pending_approval",
    "verification_email_sent": true
  }
}
```

### POST /api/v1/auth/refresh
**Refresh access token**
```json
Request:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

Response (200):
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400
  }
}
```

### POST /api/v1/auth/logout
**Logout user (invalidate tokens)**
```json
Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/v1/auth/forgot-password
**Request password reset**
```json
Request:
{
  "email": "user@dddp.online"
}

Response (200):
{
  "success": true,
  "message": "Password reset email sent"
}
```

### POST /api/v1/auth/reset-password
**Reset password with token**
```json
Request:
{
  "token": "reset-token-here",
  "password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Password reset successfully"
}
```

### POST /api/v1/auth/verify-email
**Verify email address**
```json
Request:
{
  "token": "email-verification-token"
}

Response (200):
{
  "success": true,
  "message": "Email verified successfully"
}
```

## User Management Endpoints

### GET /api/v1/users/profile
**Get current user profile**
```json
Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "mobile_number": "+1234567890",
    "profession": {
      "id": 1,
      "name": "Software Engineer"
    },
    "roles": [
      {
        "id": 50,
        "name": "Owner",
        "apartment_id": 101,
        "ownership_percentage": 100
      },
      {
        "id": 80,
        "name": "Secretary",
        "is_pst_member": true
      }
    ],
    "apartments": [
      {
        "id": 101,
        "floor_number": 1,
        "unit_type": "A",
        "unit_number": "101",
        "ownership_percentage": 100,
        "lease_start_date": null,
        "lease_end_date": null
      }
    ],
    "emergency_contact_name": "Jane Doe",
    "emergency_contact_number": "+1234567891",
    "vehicle_info": "Honda Civic - ABC123",
    "profile_photo_url": "/uploads/profiles/user_1.jpg",
    "email_verified": true,
    "mobile_verified": false,
    "must_reset_password": false,
    "last_login_at": "2025-01-15T10:30:00Z",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### PUT /api/v1/users/profile
**Update user profile**
```json
Request:
{
  "full_name": "John Smith",
  "mobile_number": "+1234567890",
  "profession_id": 2,
  "emergency_contact_name": "Jane Smith",
  "emergency_contact_number": "+1234567891",
  "vehicle_info": "Honda Civic - ABC123"
}

Response (200):
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { /* updated user object */ }
}
```

### POST /api/v1/users/change-password
**Change user password**
```json
Request:
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Password changed successfully"
}
```

### POST /api/v1/users/profile-photo
**Upload profile photo**
```json
Content-Type: multipart/form-data

Form Data:
- profile_photo: [file]

Response (200):
{
  "success": true,
  "data": {
    "profile_photo_url": "/uploads/profiles/user_1_1234567890.jpg"
  }
}
```

### GET /api/v1/users
**Get users list (Admin/PST only)**
```json
Query Parameters:
- page=1
- limit=20
- search=john
- role=Owner
- status=active
- apartment_id=101

Response (200):
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "full_name": "John Doe",
        "email": "john@example.com",
        "mobile_number": "+1234567890",
        "roles": ["Owner"],
        "apartments": ["1 A"],
        "status": "active",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 75,
      "total_pages": 4
    }
  }
}
```

### GET /api/v1/users/{id}
**Get specific user details (Admin/PST only)**
```json
Response (200):
{
  "success": true,
  "data": { /* full user object */ }
}
```

### PUT /api/v1/users/{id}
**Update user (Admin/PST only)**
```json
Request:
{
  "full_name": "Updated Name",
  "email": "newemail@example.com",
  "mobile_number": "+1234567890",
  "profession_id": 1,
  "emergency_contact_name": "Updated Contact",
  "reason": "Administrative update"
}

Response (200):
{
  "success": true,
  "message": "User updated successfully",
  "data": { /* updated user object */ }
}
```

### PUT /api/v1/users/{id}/roles
**Assign roles to user (Admin/PST only)**
```json
Request:
{
  "roles": [
    {
      "role_id": 50,
      "apartment_id": 101
    },
    {
      "role_id": 30,
      "apartment_id": 102,
      "lease_start_date": "2025-01-01",
      "lease_end_date": "2025-12-31"
    }
  ],
  "reason": "Role assignment for new tenant"
}

Response (200):
{
  "success": true,
  "message": "Roles assigned successfully"
}
```

## Apartment Management Endpoints

### GET /api/v1/apartments
**Get apartments list (with proper ordering)**
```json
Query Parameters:
- page=1
- limit=20
- search=1 A
- floor=1
- type=A
- owner_id=1
- tenant_id=1

Response (200):
{
  "success": true,
  "data": {
    "apartments": [
      {
        "id": 101,
        "floor_number": 1,
        "unit_type": "A",
        "unit_number": "101",
        "display_name": "1 A",
        "square_footage": 1450.50,
        "building_name": "Diamond Tower",
        "owners": [
          {
            "user_id": 1,
            "full_name": "John Doe",
            "ownership_percentage": 100,
            "start_date": "2025-01-01"
          }
        ],
        "tenants": [
          {
            "user_id": 2,
            "full_name": "Jane Smith",
            "lease_start_date": "2025-01-01",
            "lease_end_date": "2025-12-31"
          }
        ],
        "parking_slots": [
          {
            "id": 1,
            "slot_number": 1,
            "assigned_to_user_id": 1,
            "vehicle_info": "Honda Civic"
          }
        ],
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 200,
      "total_pages": 10
    }
  }
}
```

### GET /api/v1/apartments/{id}
**Get apartment details**
```json
Response (200):
{
  "success": true,
  "data": { /* full apartment object with relationships */ }
}
```

### POST /api/v1/apartments
**Create new apartment (Admin only)**
```json
Request:
{
  "floor_number": 1,
  "unit_type": "A",
  "unit_number": "101",
  "square_footage": 1450.50,
  "building_name": "Diamond Tower"
}

Response (201):
{
  "success": true,
  "data": { /* created apartment object */ }
}
```

### PUT /api/v1/apartments/{id}
**Update apartment (Admin only)**
```json
Request:
{
  "square_footage": 1500.00,
  "building_name": "Updated Tower Name"
}

Response (200):
{
  "success": true,
  "data": { /* updated apartment object */ }
}
```

### GET /api/v1/apartments/available
**Get available apartments for registration**
```json
Response (200):
{
  "success": true,
  "data": {
    "apartments": [
      {
        "id": 101,
        "display_name": "1 A",
        "floor_number": 1,
        "unit_type": "A",
        "is_available": true
      }
    ]
  }
}
```

## Approval Workflow Endpoints

### GET /api/v1/approvals/pending
**Get pending approvals (PST/Admin)**
```json
Query Parameters:
- type=registration|transfer|lease
- page=1
- limit=10

Response (200):
{
  "success": true,
  "data": {
    "approvals": [
      {
        "id": 1,
        "type": "registration",
        "user_id": 123,
        "user_name": "John Doe",
        "apartment_id": 101,
        "apartment_name": "1 A",
        "requested_role": "Owner",
        "lease_start_date": null,
        "lease_end_date": null,
        "status": "pending",
        "created_at": "2025-01-15T10:00:00Z",
        "waiting_hours": 2
      },
      {
        "id": 2,
        "type": "transfer",
        "transfer_id": 456,
        "from_user_name": "John Doe",
        "to_user_name": "Jane Smith",
        "apartment_name": "1 A",
        "ownership_percentage": 50,
        "status": "pending",
        "created_at": "2025-01-15T08:00:00Z",
        "waiting_hours": 4
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

### POST /api/v1/approvals/{id}/approve
**Approve request (PST/Admin)**
```json
Request:
{
  "comments": "Approved - All documents verified"
}

Response (200):
{
  "success": true,
  "message": "Request approved successfully",
  "data": {
    "approval_id": 1,
    "approved_by": "President",
    "approved_by_user": "John Doe",
    "approved_at": "2025-01-15T12:00:00Z"
  }
}
```

### POST /api/v1/approvals/{id}/reject
**Reject request (PST/Admin)**
```json
Request:
{
  "reason": "Invalid documentation",
  "comments": "Please provide valid ownership documents"
}

Response (200):
{
  "success": true,
  "message": "Request rejected",
  "data": {
    "approval_id": 1,
    "rejected_by": "Secretary",
    "rejected_by_user": "Jane Smith",
    "rejected_at": "2025-01-15T12:00:00Z",
    "reason": "Invalid documentation"
  }
}
```

### GET /api/v1/approvals/history
**Get approval history (PST/Admin)**
```json
Query Parameters:
- type=all
- status=approved|rejected
- date_from=2025-01-01
- date_to=2025-01-31
- approved_by=President

Response (200):
{
  "success": true,
  "data": {
    "history": [
      {
        "id": 1,
        "type": "registration",
        "user_name": "John Doe",
        "approved_by_role": "President",
        "approved_by_user": "Mike Johnson",
        "approved_at": "2025-01-15T12:00:00Z",
        "status": "approved"
      }
    ],
    "summary": {
      "total_approved": 45,
      "total_rejected": 3,
      "avg_approval_time_hours": 4.2
    }
  }
}
```

## Ownership Transfer Endpoints

### POST /api/v1/transfers
**Initiate ownership transfer**
```json
Request:
{
  "apartment_id": 101,
  "to_user_id": 456,
  "ownership_percentage": 50,
  "transfer_reason": "Sale of property share"
}

Response (201):
{
  "success": true,
  "message": "Transfer request submitted for PST approval",
  "data": {
    "transfer_id": 789,
    "status": "pending_approval",
    "pst_notified": true
  }
}
```

### GET /api/v1/transfers
**Get user's transfer history**
```json
Response (200):
{
  "success": true,
  "data": {
    "transfers": [
      {
        "id": 789,
        "apartment_name": "1 A",
        "from_user_name": "John Doe",
        "to_user_name": "Jane Smith",
        "ownership_percentage": 50,
        "status": "pending",
        "created_at": "2025-01-15T10:00:00Z",
        "approved_by_role": null,
        "approved_at": null
      }
    ]
  }
}
```

### GET /api/v1/transfers/{id}
**Get transfer details**
```json
Response (200):
{
  "success": true,
  "data": { /* full transfer object */ }
}
```

## Notification Endpoints

### GET /api/v1/notifications
**Get user notifications**
```json
Query Parameters:
- page=1
- limit=20
- is_read=false
- priority=high

Response (200):
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "registration_approved",
        "title": "Registration Approved",
        "message": "Your registration has been approved by President John Doe",
        "priority": "high",
        "is_read": false,
        "link_url": "/profile",
        "sent_by_role": "President",
        "created_at": "2025-01-15T12:00:00Z"
      }
    ],
    "unread_count": 3,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "total_pages": 2
    }
  }
}
```

### PUT /api/v1/notifications/{id}/read
**Mark notification as read**
```json
Response (200):
{
  "success": true,
  "message": "Notification marked as read"
}
```

### PUT /api/v1/notifications/mark-all-read
**Mark all notifications as read**
```json
Response (200):
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### DELETE /api/v1/notifications/{id}
**Delete notification**
```json
Response (200):
{
  "success": true,
  "message": "Notification deleted"
}
```

### POST /api/v1/notifications/send
**Send notification (Admin/PST only)**
```json
Request:
{
  "user_ids": [1, 2, 3], // or "all" for broadcast
  "title": "System Maintenance",
  "message": "System will be down for maintenance on Sunday 2-4 AM",
  "priority": "high",
  "link_url": "/announcements"
}

Response (201):
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "sent_count": 75
  }
}
```

## Parking Management Endpoints

### GET /api/v1/parking/slots
**Get parking slots**
```json
Query Parameters:
- apartment_id=101
- assigned=false
- user_id=1

Response (200):
{
  "success": true,
  "data": {
    "slots": [
      {
        "id": 1,
        "slot_number": 1,
        "apartment_id": 101,
        "apartment_name": "1 A",
        "assigned_to_user_id": 1,
        "assigned_to_user_name": "John Doe",
        "vehicle_info": "Honda Civic - ABC123",
        "assignment_date": "2025-01-01",
        "assigned_by_user_name": "Admin",
        "is_active": true
      }
    ]
  }
}
```

### POST /api/v1/parking/slots/{id}/assign
**Assign parking slot (Admin/PST only)**
```json
Request:
{
  "user_id": 123,
  "vehicle_info": "Toyota Camry - XYZ789",
  "reason": "New resident parking assignment"
}

Response (200):
{
  "success": true,
  "message": "Parking slot assigned successfully",
  "data": { /* updated slot object */ }
}
```

### POST /api/v1/parking/slots/{id}/unassign
**Unassign parking slot (Admin/PST only)**
```json
Request:
{
  "reason": "Resident moved out"
}

Response (200):
{
  "success": true,
  "message": "Parking slot unassigned successfully"
}
```

## Role Management Endpoints

### GET /api/v1/roles
**Get available roles**
```json
Response (200):
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 10,
        "name": "Resident",
        "permission_level": 10,
        "description": "Read-only access"
      },
      {
        "id": 30,
        "name": "Tenant",
        "permission_level": 30,
        "description": "Limited access to own profile"
      },
      {
        "id": 50,
        "name": "Owner",
        "permission_level": 50,
        "description": "Can manage own apartments"
      },
      {
        "id": 80,
        "name": "President",
        "permission_level": 80,
        "description": "PST Committee member - instant approval authority"
      }
    ]
  }
}
```

### POST /api/v1/users/switch-role
**Switch current user role**
```json
Request:
{
  "role_id": 80,
  "apartment_id": 101 // optional, for apartment-specific roles
}

Response (200):
{
  "success": true,
  "message": "Role switched successfully",
  "data": {
    "current_role": "President",
    "permissions": ["approve_registrations", "approve_transfers", "manage_users"]
  }
}
```

## Audit & Reporting Endpoints

### GET /api/v1/audit/logs
**Get audit logs (Admin/PST only)**
```json
Query Parameters:
- user_id=1
- action=login
- table_name=users
- date_from=2025-01-01
- date_to=2025-01-31
- page=1
- limit=50

Response (200):
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "user_id": 1,
        "user_name": "John Doe",
        "action": "UPDATE",
        "table_name": "users",
        "record_id": 123,
        "old_value": {"full_name": "John Doe"},
        "new_value": {"full_name": "John Smith"},
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "user_role": "Admin",
        "reason": "Name correction",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "total_pages": 25
    }
  }
}
```

### GET /api/v1/reports/dashboard
**Get dashboard statistics (Admin/PST)**
```json
Response (200):
{
  "success": true,
  "data": {
    "user_stats": {
      "total_users": 75,
      "active_users": 72,
      "pending_approvals": 3,
      "new_registrations_today": 2
    },
    "apartment_stats": {
      "total_apartments": 200,
      "occupied_apartments": 180,
      "vacant_apartments": 20
    },
    "approval_stats": {
      "pending_approvals": 5,
      "approved_today": 8,
      "rejected_today": 1,
      "avg_approval_time_hours": 4.2
    },
    "pst_stats": {
      "total_actions_today": 12,
      "president_actions": 5,
      "secretary_actions": 4,
      "treasurer_actions": 3
    }
  }
}
```

## System Health Endpoints

### GET /api/v1/health
**System health check**
```json
Response (200):
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "email": "operational"
  },
  "uptime": "5 days, 2 hours",
  "version": "1.0.0"
}
```

### GET /api/v1/health/detailed
**Detailed health check (Admin only)**
```json
Response (200):
{
  "success": true,
  "status": "healthy",
  "database": {
    "status": "connected",
    "connection_pool": {
      "used": 2,
      "available": 8,
      "pending": 0
    },
    "query_stats": {
      "slow_queries": 0,
      "avg_query_time_ms": 15.2
    }
  },
  "system": {
    "cpu_usage": 25.5,
    "memory_usage": {
      "used": 512,
      "total": 2048,
      "percentage": 25.0
    },
    "disk_usage": {
      "used": 15.2,
      "total": 50.0,
      "percentage": 30.4
    }
  },
  "notifications": {
    "pending_notifications": 12,
    "email_queue": 0,
    "failed_emails": 0
  }
}
```

## Error Response Format

All API errors follow this format:
```json
Response (400/401/403/404/500):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Email format is invalid"
    }
  }
}
```

## Rate Limiting

- **General endpoints:** 100 requests per 15 minutes per IP
- **Authentication endpoints:** 5 requests per 15 minutes per IP
- **File upload endpoints:** 10 requests per hour per user

Rate limit exceeded response:
```json
Response (429):
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retry_after": 900
  }
}
```

This API design provides comprehensive coverage of all system functionality with proper authentication, authorization, data validation, and error handling for the DD Diamond Park Apartment Management System.