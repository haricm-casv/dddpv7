const models = require('../models');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.queue = null; // Will be set when queue service is implemented
    this.emailService = null; // Will be set when email service is implemented
    this.smsService = null; // Will be set when SMS service is implemented
    this.webSocketServer = null; // Will be set when WebSocket server is implemented
  }

  // Set dependencies
  setQueue(queue) {
    this.queue = queue;
  }

  setEmailService(emailService) {
    this.emailService = emailService;
  }

  setSmsService(smsService) {
    this.smsService = smsService;
  }

  setWebSocketServer(webSocketServer) {
    this.webSocketServer = webSocketServer;
  }

  // Create and send notification
  async createNotification(notificationData) {
    const notification = await models.Notification.create({
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
    if (notificationData.sendEmail && this.queue) {
      await this.queue.addToEmailQueue(notification);
    }

    if (notificationData.sendSMS && this.queue) {
      await this.queue.addToSMSQueue(notification);
    }

    // Emit real-time notification via WebSocket
    if (this.webSocketServer) {
      this.webSocketServer.sendToUser(notification.user_id, {
        id: notification.id,
        type: notification.notification_type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        link_url: notification.link_url,
        created_at: notification.created_at
      });
    }

    logger.info(`Notification created: ${notification.title} for user ${notification.user_id}`);
    return notification;
  }

  // Bulk notification creation
  async createBulkNotifications(notificationsData) {
    const notifications = await models.Notification.bulkCreate(notificationsData);

    // Process each notification for additional delivery
    for (const notification of notifications) {
      if (notification.sendEmail && this.queue) {
        await this.queue.addToEmailQueue(notification);
      }

      if (notification.sendSMS && this.queue) {
        await this.queue.addToSMSQueue(notification);
      }

      // Emit real-time notification via WebSocket
      if (this.webSocketServer) {
        this.webSocketServer.sendToUser(notification.user_id, {
          id: notification.id,
          type: notification.notification_type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          link_url: notification.link_url,
          created_at: notification.created_at
        });
      }
    }

    logger.info(`Bulk notifications created: ${notifications.length} notifications`);
    return notifications;
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const notification = await models.Notification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (notification && !notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();

      logger.info(`Notification marked as read: ${notificationId} by user ${userId}`);
    }

    return notification;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    const [affectedRows] = await models.Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );

    logger.info(`All notifications marked as read for user ${userId}: ${affectedRows} notifications`);
    return affectedRows;
  }

  // Get user notifications with pagination
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, isRead, priority, type } = options;

    const whereClause = { user_id: userId };
    if (isRead !== undefined) whereClause.is_read = isRead;
    if (priority) whereClause.priority = priority;
    if (type) whereClause.notification_type = type;

    const notifications = await models.Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      include: [{
        model: models.User,
        as: 'sentBy',
        attributes: ['id', 'full_name'],
        required: false
      }]
    });

    const unreadCount = await models.Notification.count({
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

  // Delete notification
  async deleteNotification(notificationId, userId) {
    const notification = await models.Notification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.destroy();
    logger.info(`Notification deleted: ${notificationId} by user ${userId}`);

    return true;
  }

  // Get notification statistics for a user
  async getNotificationStats(userId) {
    const stats = await models.Notification.findAll({
      where: { user_id: userId },
      attributes: [
        'priority',
        'is_read',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['priority', 'is_read']
    });

    const result = {
      total: 0,
      unread: 0,
      by_priority: {
        low: { total: 0, unread: 0 },
        medium: { total: 0, unread: 0 },
        high: { total: 0, unread: 0 },
        critical: { total: 0, unread: 0 }
      }
    };

    stats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      const priority = stat.priority;
      const isRead = stat.is_read;

      result.total += count;
      if (!isRead) result.unread += count;

      result.by_priority[priority].total += count;
      if (!isRead) result.by_priority[priority].unread += count;
    });

    return result;
  }

  // PST-specific notification methods
  async getPSTMembers() {
    const pstMembers = await models.UserRole.findAll({
      where: {
        role_id: { [models.Sequelize.Op.in]: [80] }, // PST Committee roles
        is_active: true
      },
      include: [{
        model: models.User,
        as: 'user',
        attributes: ['id', 'full_name', 'email']
      }]
    });

    return pstMembers.map(ur => ur.user);
  }

  // Get PST notification priority
  getPSTNotificationPriority(notificationType, userRole) {
    if (!this.isPSTMember(userRole)) return 'medium';

    const priorityMap = {
      'new_registration_request': 'high',
      'transfer_request_submitted': 'critical',
      'lease_modification_request': 'high',
      'pending_queue_alert': 'high',
      'emergency_decision_required': 'critical',
      'system_alert': 'high'
    };

    return priorityMap[notificationType] || 'medium';
  }

  // Check if user is PST member
  async isPSTMember(userId) {
    const pstRole = await models.UserRole.findOne({
      where: {
        user_id: userId,
        role_id: { [models.Sequelize.Op.in]: [80] },
        is_active: true
      }
    });

    return !!pstRole;
  }

  // Send notification to all PST members
  async notifyPSTMembers(notificationData) {
    const pstMembers = await this.getPSTMembers();

    const notifications = pstMembers.map(pst => ({
      userId: pst.id,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      linkUrl: notificationData.linkUrl,
      priority: this.getPSTNotificationPriority(notificationData.type, 'PST'),
      sendEmail: notificationData.sendEmail || false,
      sentByRole: notificationData.sentByRole || 'System'
    }));

    return await this.createBulkNotifications(notifications);
  }
}

module.exports = new NotificationService();