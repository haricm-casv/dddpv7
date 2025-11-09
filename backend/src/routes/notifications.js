const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const models = require('../models');
const notificationService = require('../services/notificationService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/notifications
 * @desc Get user notifications with pagination and filtering
 * @access Private
 */
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('is_read').optional().isBoolean().withMessage('is_read must be a boolean'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  query('type').optional().isString().withMessage('Type must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array()
        }
      });
    }

    const { page = 1, limit = 20, is_read, priority, type } = req.query;
    const userId = req.user.id;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    if (is_read !== undefined) options.isRead = is_read === 'true';
    if (priority) options.priority = priority;
    if (type) options.type = type;

    const result = await notificationService.getUserNotifications(userId, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATIONS_FETCH_FAILED',
        message: 'Failed to fetch notifications'
      }
    });
  }
});

/**
 * @route GET /api/v1/notifications/stats
 * @desc Get notification statistics for the current user
 * @access Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await notificationService.getNotificationStats(userId);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_STATS_FAILED',
        message: 'Failed to fetch notification statistics'
      }
    });
  }
});

/**
 * @route PUT /api/v1/notifications/:id/read
 * @desc Mark a notification as read
 * @access Private
 */
router.put('/:id/read', authenticate, [
  param('id').isInt().withMessage('Invalid notification ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification ID',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_UPDATE_FAILED',
        message: 'Failed to mark notification as read'
      }
    });
  }
});

/**
 * @route PUT /api/v1/notifications/read-all
 * @desc Mark all notifications as read for the current user
 * @access Private
 */
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const affectedRows = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${affectedRows} notifications marked as read`
    });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_UPDATE_FAILED',
        message: 'Failed to mark notifications as read'
      }
    });
  }
});

/**
 * @route DELETE /api/v1/notifications/:id
 * @desc Delete a notification
 * @access Private
 */
router.delete('/:id', authenticate, [
  param('id').isInt().withMessage('Invalid notification ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification ID',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    await notificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Notification not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    logger.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_DELETE_FAILED',
        message: 'Failed to delete notification'
      }
    });
  }
});

/**
 * @route POST /api/v1/notifications
 * @desc Create a new notification (admin/system only)
 * @access Private (Admin)
 */
router.post('/', authenticate, [
  body('userId').isInt().withMessage('userId must be an integer'),
  body('type').isString().notEmpty().withMessage('Type is required'),
  body('title').isString().notEmpty().withMessage('Title is required'),
  body('message').isString().notEmpty().withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('linkUrl').optional().isURL().withMessage('Invalid link URL'),
  body('sendEmail').optional().isBoolean().withMessage('sendEmail must be a boolean'),
  body('sendSMS').optional().isBoolean().withMessage('sendSMS must be a boolean')
], async (req, res) => {
  try {
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

    // Only allow admins or system to create notifications
    if (req.user.permissions.maxPermissionLevel < 70) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can create notifications'
        }
      });
    }

    const notificationData = {
      ...req.body,
      sentByUserId: req.user.id,
      sentByRole: req.user.role
    };

    const notification = await notificationService.createNotification(notificationData);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification }
    });
  } catch (error) {
    logger.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_CREATE_FAILED',
        message: 'Failed to create notification'
      }
    });
  }
});

/**
 * @route POST /api/v1/notifications/bulk
 * @desc Create bulk notifications (admin/system only)
 * @access Private (Admin)
 */
router.post('/bulk', authenticate, [
  body('notifications').isArray().withMessage('Notifications must be an array'),
  body('notifications.*.userId').isInt().withMessage('userId must be an integer'),
  body('notifications.*.type').isString().notEmpty().withMessage('Type is required'),
  body('notifications.*.title').isString().notEmpty().withMessage('Title is required'),
  body('notifications.*.message').isString().notEmpty().withMessage('Message is required'),
  body('notifications.*.priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('notifications.*.linkUrl').optional().isURL().withMessage('Invalid link URL'),
  body('notifications.*.sendEmail').optional().isBoolean().withMessage('sendEmail must be a boolean'),
  body('notifications.*.sendSMS').optional().isBoolean().withMessage('sendSMS must be a boolean')
], async (req, res) => {
  try {
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

    // Only allow admins or system to create notifications
    if (req.user.permissions.maxPermissionLevel < 70) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can create bulk notifications'
        }
      });
    }

    const { notifications } = req.body;
    const notificationsData = notifications.map(notification => ({
      ...notification,
      sentByUserId: req.user.id,
      sentByRole: req.user.role
    }));

    const createdNotifications = await notificationService.createBulkNotifications(notificationsData);

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notifications created successfully`,
      data: { notifications: createdNotifications }
    });
  } catch (error) {
    logger.error('Create bulk notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_BULK_CREATE_FAILED',
        message: 'Failed to create bulk notifications'
      }
    });
  }
});

module.exports = router;