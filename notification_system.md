# Notification System Architecture

## Overview

**Notification Types:** In-app, Email (future), SMS (future)
**Priority Levels:** Low, Medium, High, Critical
**Target Users:** All users, specific roles, PST Committee
**Delivery:** Real-time for in-app, queued for email/SMS

## System Architecture

### 1. Notification Flow Architecture

```
Event Trigger → Notification Service → Queue → Delivery → User Interface
     ↓              ↓                    ↓         ↓           ↓
  Database      Create Notification   Redis    Send Email   Bell Icon
  Update        Store in DB          Queue    Send SMS     Badge Count
  Audit Log      Queue for Email     Worker   Mark Read    Notification
                                                         Center
```

### 2. Database Schema for Notifications

```sql
-- notifications table (from database schema)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    sent_by_user_id INTEGER REFERENCES users(id),
    sent_by_role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,

    CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);
```

### 3. Notification Service Implementation

#### Core Notification Service
```javascript
// services/notificationService.js
class NotificationService {
  constructor() {
    this.queue = new NotificationQueue();
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  // Create and send notification
  async createNotification(notificationData) {
    const notification = await Notification.create({
      user_id: notificationData.userId,
      notification_type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      link_url: notificationData.linkUrl,
      priority: notificationData.priority || 'medium',
      sent_by_user_id: notificationData.sentByUserId,
      sent_by_role: notificationData.sentByRole
    });

    // Queue for additional delivery methods
    if (notificationData.sendEmail) {
      await this.queue.addToEmailQueue(notification);
    }

    if (notificationData.sendSMS) {
      await this.queue.addToSMSQueue(notification);
    }

    // Emit real-time notification via WebSocket
    this.emitRealTimeNotification(notification);

    return notification;
  }

  // Bulk notification creation
  async createBulkNotifications(notificationsData) {
    const notifications = await Notification.bulkCreate(notificationsData);

    // Process each notification for additional delivery
    for (const notification of notifications) {
      if (notification.sendEmail) {
        await this.queue.addToEmailQueue(notification);
      }
    }

    return notifications;
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (notification) {
      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();
    }

    return notification;
  }

  // Get user notifications with pagination
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, isRead, priority } = options;

    const whereClause = { user_id: userId };
    if (isRead !== undefined) whereClause.is_read = isRead;
    if (priority) whereClause.priority = priority;

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    const unreadCount = await Notification.count({
      where: { user_id: userId, is_read: false }
    });

    return {
      notifications: notifications.rows,
      pagination: {
        page,
        limit,
        total: notifications.count,
        total_pages: Math.ceil(notifications.count / limit)
      },
      unread_count: unreadCount
    };
  }
}
```

#### Notification Queue System
```javascript
// services/notificationQueue.js
const Redis = require('ioredis');

class NotificationQueue {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.emailQueue = 'notification:email';
    this.smsQueue = 'notification:sms';
  }

  async addToEmailQueue(notification) {
    await this.redis.lpush(this.emailQueue, JSON.stringify({
      notificationId: notification.id,
      userId: notification.user_id,
      type: notification.notification_type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority
    }));
  }

  async addToSMSQueue(notification) {
    await this.redis.lpush(this.smsQueue, JSON.stringify({
      notificationId: notification.id,
      userId: notification.user_id,
      message: this.formatSMSMessage(notification)
    }));
  }

  formatSMSMessage(notification) {
    // Keep SMS messages under 160 characters
    const prefix = 'DD Diamond Park: ';
    const maxLength = 160 - prefix.length;

    let message = notification.title;
    if (notification.message.length > 0) {
      message += ' - ' + notification.message.substring(0, maxLength - message.length - 3) + '...';
    }

    return prefix + message;
  }

  async processEmailQueue() {
    const job = await this.redis.rpop(this.emailQueue);
    if (job) {
      const data = JSON.parse(job);
      await this.emailService.sendNotificationEmail(data);
    }
  }

  async processSMSQueue() {
    const job = await this.redis.rpop(this.smsQueue);
    if (job) {
      const data = JSON.parse(job);
      await this.smsService.sendSMS(data);
    }
  }
}
```

## Notification Types and Triggers

### 1. Approval-Related Notifications

#### New Registration Request (to PST Committee)
```javascript
const notifyNewRegistration = async (userId, userData) => {
  // Get all active PST members
  const pstMembers = await UserRole.findAll({
    where: {
      role_id: { [Op.in]: [80] }, // PST Committee roles
      is_active: true
    },
    include: [{ model: User, as: 'user' }]
  });

  const notifications = pstMembers.map(pst => ({
    userId: pst.user_id,
    type: 'new_registration_request',
    title: 'New Registration Request',
    message: `${userData.full_name} has submitted a registration request for apartment ${userData.apartment_name} as ${userData.primary_role}`,
    linkUrl: `/approvals/registration/${userId}`,
    priority: 'high',
    sendEmail: true, // PST gets instant email alerts
    sentByRole: 'System'
  }));

  await notificationService.createBulkNotifications(notifications);
};
```

#### Registration Approved/Rejected
```javascript
const notifyRegistrationDecision = async (userId, decision, approvedBy) => {
  const status = decision === 'approved' ? 'approved' : 'rejected';
  const title = `Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  const message = decision === 'approved'
    ? `Your registration has been approved by ${approvedBy.role}. You can now log in with your temporary password.`
    : `Your registration has been rejected by ${approvedBy.role}. Reason: ${decision.reason}`;

  await notificationService.createNotification({
    userId,
    type: `registration_${status}`,
    title,
    message,
    linkUrl: '/profile',
    priority: 'high',
    sentByUserId: approvedBy.userId,
    sentByRole: approvedBy.role
  });
};
```

### 2. Ownership Transfer Notifications

#### Transfer Request Submitted
```javascript
const notifyTransferRequest = async (transferData) => {
  const pstMembers = await getPSTMembers();

  const notifications = pstMembers.map(pst => ({
    userId: pst.id,
    type: 'transfer_request_submitted',
    title: 'Ownership Transfer Request',
    message: `${transferData.fromUserName} wants to transfer ${transferData.percentage}% ownership of apartment ${transferData.apartmentName} to ${transferData.toUserName}`,
    linkUrl: `/approvals/transfer/${transferData.transferId}`,
    priority: 'critical',
    sendEmail: true,
    sentByUserId: transferData.fromUserId,
    sentByRole: 'Owner'
  }));

  await notificationService.createBulkNotifications(notifications);
};
```

#### Transfer Approved/Rejected
```javascript
const notifyTransferDecision = async (transferData, decision, pstMember) => {
  const notifications = [
    // Notify transferor
    {
      userId: transferData.fromUserId,
      type: `transfer_${decision}`,
      title: `Ownership Transfer ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
      message: `Your ownership transfer request for apartment ${transferData.apartmentName} has been ${decision} by ${pstMember.role} ${pstMember.name}`,
      linkUrl: '/transfers',
      priority: 'high',
      sentByUserId: pstMember.id,
      sentByRole: pstMember.role
    },
    // Notify transferee
    {
      userId: transferData.toUserId,
      type: `transfer_${decision}`,
      title: `Ownership Transfer ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
      message: `Ownership transfer request for apartment ${transferData.apartmentName} has been ${decision} by ${pstMember.role} ${pstMember.name}`,
      linkUrl: '/transfers',
      priority: 'high',
      sentByUserId: pstMember.id,
      sentByRole: pstMember.role
    }
  ];

  for (const notification of notifications) {
    await notificationService.createNotification(notification);
  }
};
```

### 3. Security & Password Notifications

#### Password Change Required
```javascript
const notifyPasswordResetRequired = async (userId) => {
  await notificationService.createNotification({
    userId,
    type: 'password_reset_required',
    title: 'Password Reset Required',
    message: 'You must reset your password before continuing. This is required for security purposes.',
    linkUrl: '/change-password',
    priority: 'critical',
    sentByRole: 'System'
  });
};
```

#### Weak Password Warning
```javascript
const notifyWeakPassword = async (userId) => {
  await notificationService.createNotification({
    userId,
    type: 'weak_password_warning',
    title: 'Password Security Warning',
    message: 'Your current password does not meet security requirements. Please update it to continue using the system.',
    linkUrl: '/change-password',
    priority: 'medium',
    sentByRole: 'System'
  });
};
```

### 4. Lease Management Notifications

#### Lease Expiration Reminder
```javascript
const notifyLeaseExpiration = async (tenantId, ownerIds, apartmentName, daysUntilExpiration) => {
  const reminders = [
    { days: 30, priority: 'high' },
    { days: 15, priority: 'high' },
    { days: 7, priority: 'critical' },
    { days: 1, priority: 'critical' }
  ];

  const reminder = reminders.find(r => r.days === daysUntilExpiration);
  if (!reminder) return;

  const title = `Lease Expiration Notice - ${daysUntilExpiration} days`;
  const message = `Lease for apartment ${apartmentName} expires in ${daysUntilExpiration} days.`;

  // Notify tenant
  await notificationService.createNotification({
    userId: tenantId,
    type: 'lease_expiration_reminder',
    title,
    message: `${message} Please contact your owner to discuss renewal.`,
    linkUrl: '/profile',
    priority: reminder.priority,
    sentByRole: 'System'
  });

  // Notify owners
  for (const ownerId of ownerIds) {
    await notificationService.createNotification({
      userId: ownerId,
      type: 'lease_expiration_reminder',
      title,
      message: `${message} Please contact your tenant regarding renewal.`,
      linkUrl: '/apartments',
      priority: reminder.priority,
      sentByRole: 'System'
    });
  }
};
```

### 5. PST-Specific Notifications

#### Pending Approval Queue Alert
```javascript
const notifyPSTPendingQueue = async () => {
  // Check for requests pending > 24 hours
  const pendingRequests = await ApprovalRequest.count({
    where: {
      status: 'pending',
      created_at: {
        [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  });

  if (pendingRequests > 0) {
    const pstMembers = await getPSTMembers();

    const notifications = pstMembers.map(pst => ({
      userId: pst.id,
      type: 'pending_queue_alert',
      title: 'Pending Approvals Alert',
      message: `There are ${pendingRequests} approval requests pending for more than 24 hours. Please review them urgently.`,
      linkUrl: '/approvals',
      priority: 'high',
      sentByRole: 'System'
    }));

    await notificationService.createBulkNotifications(notifications);
  }
};
```

#### Emergency Decision Required
```javascript
const notifyPSTEmergency = async (emergencyData) => {
  const pstMembers = await getPSTMembers();

  const notifications = pstMembers.map(pst => ({
    userId: pst.id,
    type: 'emergency_decision_required',
    title: 'Emergency Decision Required',
    message: `URGENT: ${emergencyData.title} - ${emergencyData.description}`,
    linkUrl: emergencyData.linkUrl,
    priority: 'critical',
    sendEmail: true,
    sendSMS: true, // Future SMS implementation
    sentByUserId: emergencyData.raisedBy,
    sentByRole: emergencyData.raisedByRole
  }));

  await notificationService.createBulkNotifications(notifications);
};
```

## Real-Time Notification Delivery

### WebSocket Implementation
```javascript
// server/websocket.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> WebSocket connection

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });
  }

  handleConnection(ws, request) {
    // Extract token from query parameters
    const token = new URL(request.url, 'ws://localhost').searchParams.get('token');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user_id;

      // Store connection
      this.clients.set(userId, ws);

      ws.on('close', () => {
        this.clients.delete(userId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(userId);
      });

    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  }

  // Send notification to specific user
  sendToUser(userId, notification) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
    }
  }

  // Broadcast to multiple users
  broadcastToUsers(userIds, notification) {
    userIds.forEach(userId => {
      this.sendToUser(userId, notification);
    });
  }
}

// Integration with notification service
const emitRealTimeNotification = (notification) => {
  wss.sendToUser(notification.user_id, {
    id: notification.id,
    type: notification.notification_type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    created_at: notification.created_at
  });
};
```

## Email Notification System (Future Phase)

### Email Templates
```javascript
// services/emailTemplates.js
const registrationApprovedTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .button { background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DD Diamond Park</h1>
      <h2>Registration Approved</h2>
    </div>
    <div class="content">
      <p>Dear ${data.userName},</p>
      <p>Your registration has been approved by ${data.approvedBy}.</p>
      <p>You can now log in to your account using your temporary password.</p>
      <p>Please change your password upon first login for security purposes.</p>
      <a href="${data.loginUrl}" class="button">Login Now</a>
    </div>
  </div>
</body>
</html>
`;
```

### Email Service
```javascript
// services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendNotificationEmail(notificationData) {
    const user = await User.findByPk(notificationData.userId);
    if (!user || !user.email_verified) return;

    const template = this.getEmailTemplate(notificationData.type, {
      userName: user.full_name,
      ...notificationData
    });

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: notificationData.title,
      html: template
    });
  }

  getEmailTemplate(type, data) {
    switch (type) {
      case 'registration_approved':
        return registrationApprovedTemplate(data);
      case 'transfer_approved':
        return transferApprovedTemplate(data);
      // Add more templates...
      default:
        return defaultTemplate(data);
    }
  }
}
```

## Frontend Notification Components

### Notification Bell Component
```jsx
// components/NotificationBell.js
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationBell = () => {
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-bell">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bell-button"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="notification-list">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>

          <div className="notification-footer">
            <Link to="/notifications">View All</Link>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Notification Center
```jsx
// pages/NotificationCenter.js
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationCenter = () => {
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [priority, setPriority] = useState('all'); // all, low, medium, high, critical
  const { notifications, loading, loadMore, markAllAsRead } = useNotifications();

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.is_read) return false;
    if (filter === 'read' && !notification.is_read) return false;
    if (priority !== 'all' && notification.priority !== priority) return false;
    return true;
  });

  return (
    <div className="notification-center">
      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Notifications</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button onClick={markAllAsRead}>Mark All as Read</button>
      </div>

      <div className="notification-list">
        {filteredNotifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            detailed={true}
          />
        ))}
      </div>

      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          Load More
        </button>
      )}
    </div>
  );
};
```

## PST Dashboard Priority Queue

### PST Notification Priority System
```javascript
// Determine notification priority for PST members
const getPSTNotificationPriority = (notificationType, userRole) => {
  if (!isPSTMember(userRole)) return 'medium';

  const priorityMap = {
    'new_registration_request': 'high',
    'transfer_request_submitted': 'critical',
    'lease_modification_request': 'high',
    'pending_queue_alert': 'high',
    'emergency_decision_required': 'critical',
    'system_alert': 'high'
  };

  return priorityMap[notificationType] || 'medium';
};
```

### PST Dashboard Queue Component
```jsx
// components/PSTDashboard/PriorityQueue.js
const PriorityQueue = () => {
  const { pendingApprovals, urgentNotifications } = usePSTDashboard();

  const priorityOrder = ['critical', 'high', 'medium', 'low'];

  const sortedApprovals = pendingApprovals.sort((a, b) => {
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

  return (
    <div className="pst-priority-queue">
      <h3>Priority Request Queue</h3>

      {/* Pending Registrations */}
      <div className="queue-section">
        <h4>Registration Requests</h4>
        {sortedApprovals
          .filter(a => a.type === 'registration')
          .map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={() => handleApproval(approval.id, 'approve')}
              onReject={() => handleApproval(approval.id, 'reject')}
            />
          ))}
      </div>

      {/* Pending Transfers */}
      <div className="queue-section">
        <h4>Ownership Transfers</h4>
        {sortedApprovals
          .filter(a => a.type === 'transfer')
          .map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={() => handleApproval(approval.id, 'approve')}
              onReject={() => handleApproval(approval.id, 'reject')}
            />
          ))}
      </div>

      {/* Urgent Notifications */}
      <div className="urgent-notifications">
        {urgentNotifications.map(notification => (
          <UrgentNotificationCard
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
};
```

This notification system architecture provides comprehensive coverage for all user communication needs, with special emphasis on PST Committee instant decision-making capabilities and real-time delivery for critical apartment management operations.