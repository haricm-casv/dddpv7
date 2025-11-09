const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const models = require('../models');
const { authenticate, authorize, canApprove } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/pst/dashboard
 * @desc Get PST committee dashboard data
 * @access Private (PST Members only)
 */
router.get('/dashboard', authenticate, authorize(80), async (req, res) => {
  try {
    // Verify user is PST member
    if (!req.user.isPSTMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_PST_MEMBER',
          message: 'Access restricted to PST committee members'
        }
      });
    }

    const { period = '30' } = req.query;
    const days = parseInt(period);

    // Get pending approvals count
    const pendingTransfers = await models.OwnershipTransfer.count({
      where: { status: 'pending' }
    });

    const pendingOwnerships = await models.OwnershipRelationship.count({
      where: {
        approved_at: null,
        is_active: true
      }
    });

    const pendingTenancies = await models.TenantRelationship.count({
      where: {
        approved_at: null,
        is_active: true
      }
    });

    // Get recent PST actions
    const recentActions = await models.PstCommitteeAction.findAll({
      where: {
        pst_member_user_id: req.user.id,
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      include: [{
        model: models.User,
        attributes: ['id', 'full_name']
      }],
      limit: 10,
      order: [['created_at', 'DESC']]
    });

    // Get approval statistics
    const approvalStats = await models.PstCommitteeAction.findAll({
      where: {
        pst_member_user_id: req.user.id,
        created_at: {
          [models.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      attributes: [
        'action_type',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('action_type')), 'count']
      ],
      group: ['action_type']
    });

    // Get critical notifications
    const criticalNotifications = await models.Notification.findAll({
      where: {
        user_id: req.user.id,
        priority: 'critical',
        is_read: false
      },
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        pending_approvals: {
          transfers: pendingTransfers,
          ownerships: pendingOwnerships,
          tenancies: pendingTenancies,
          total: pendingTransfers + pendingOwnerships + pendingTenancies
        },
        recent_actions: recentActions,
        approval_stats: approvalStats.reduce((acc, stat) => {
          acc[stat.action_type] = parseInt(stat.get('count'));
          return acc;
        }, {}),
        critical_notifications: criticalNotifications,
        pst_role: req.user.pstRole
      }
    });
  } catch (error) {
    logger.error('PST dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_FETCH_FAILED',
        message: 'Failed to fetch PST dashboard data'
      }
    });
  }
});

/**
 * @route GET /api/v1/pst/actions
 * @desc Get PST committee actions history
 * @access Private (PST Members only)
 */
router.get('/actions', authenticate, authorize(80), async (req, res) => {
  try {
    if (!req.user.isPSTMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_PST_MEMBER',
          message: 'Access restricted to PST committee members'
        }
      });
    }

    const { page = 1, limit = 20, action_type, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      pst_member_user_id: req.user.id
    };

    if (action_type) {
      whereClause.action_type = action_type;
    }

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[models.Sequelize.Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[models.Sequelize.Op.lte] = new Date(date_to);
    }

    const { count, rows: actions } = await models.PstCommitteeAction.findAndCountAll({
      where: whereClause,
      include: [{
        model: models.User,
        attributes: ['id', 'full_name']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        actions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('PST actions history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTIONS_FETCH_FAILED',
        message: 'Failed to fetch PST actions history'
      }
    });
  }
});

/**
 * @route GET /api/v1/pst/audit-trail
 * @desc Get comprehensive audit trail for PST actions
 * @access Private (PST Members only)
 */
router.get('/audit-trail', authenticate, authorize(80), async (req, res) => {
  try {
    if (!req.user.isPSTMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_PST_MEMBER',
          message: 'Access restricted to PST committee members'
        }
      });
    }

    const { page = 1, limit = 20, table_name, action, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      user_id: req.user.id
    };

    if (table_name) {
      whereClause.table_name = table_name;
    }

    if (action) {
      whereClause.action = action;
    }

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[models.Sequelize.Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[models.Sequelize.Op.lte] = new Date(date_to);
    }

    const { count, rows: auditLogs } = await models.AuditLog.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        audit_logs: auditLogs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('PST audit trail error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUDIT_TRAIL_FETCH_FAILED',
        message: 'Failed to fetch audit trail'
      }
    });
  }
});

/**
 * @route GET /api/v1/pst/pending-approvals
 * @desc Get all pending approvals for PST review
 * @access Private (PST Members only)
 */
router.get('/pending-approvals', authenticate, authorize(80), async (req, res) => {
  try {
    if (!req.user.isPSTMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_PST_MEMBER',
          message: 'Access restricted to PST committee members'
        }
      });
    }

    const { type, priority = 'all' } = req.query;

    let pendingItems = [];

    // Get ownership transfers
    if (!type || type === 'transfers') {
      const transfers = await models.OwnershipTransfer.findAll({
        where: { status: 'pending' },
        include: [
          {
            model: models.User,
            as: 'fromUser',
            attributes: ['id', 'full_name', 'email', 'mobile_number']
          },
          {
            model: models.User,
            as: 'toUser',
            attributes: ['id', 'full_name', 'email', 'mobile_number']
          },
          {
            model: models.Apartment,
            attributes: ['id', 'floor_number', 'unit_type', 'unit_number']
          }
        ],
        order: [['request_date', 'ASC']]
      });

      pendingItems.push(...transfers.map(t => ({
        id: t.id,
        type: 'ownership_transfer',
        priority: 'high', // All transfers are high priority
        title: `Ownership Transfer: ${t.fromUser.full_name} → ${t.toUser.full_name}`,
        description: `${t.ownership_percentage}% ownership transfer for ${t.Apartment.getDisplayName()}`,
        request_date: t.request_date,
        data: t
      })));
    }

    // Get pending ownership relationships
    if (!type || type === 'ownerships') {
      const ownerships = await models.OwnershipRelationship.findAll({
        where: {
          approved_at: null,
          is_active: true
        },
        include: [
          {
            model: models.User,
            attributes: ['id', 'full_name', 'email', 'mobile_number']
          },
          {
            model: models.Apartment,
            attributes: ['id', 'floor_number', 'unit_type', 'unit_number']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      pendingItems.push(...ownerships.map(o => ({
        id: o.id,
        type: 'ownership_relationship',
        priority: 'medium',
        title: `New Ownership: ${o.User.full_name}`,
        description: `${o.ownership_percentage}% ownership request for ${o.Apartment.getDisplayName()}`,
        request_date: o.created_at,
        data: o
      })));
    }

    // Get pending tenant relationships
    if (!type || type === 'tenancies') {
      const tenancies = await models.TenantRelationship.findAll({
        where: {
          approved_at: null,
          is_active: true
        },
        include: [
          {
            model: models.User,
            attributes: ['id', 'full_name', 'email', 'mobile_number']
          },
          {
            model: models.Apartment,
            attributes: ['id', 'floor_number', 'unit_type', 'unit_number']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      pendingItems.push(...tenancies.map(t => ({
        id: t.id,
        type: 'tenant_relationship',
        priority: 'medium',
        title: `New Tenancy: ${t.User.full_name}`,
        description: `Lease from ${t.lease_start_date} to ${t.lease_end_date} for ${t.Apartment.getDisplayName()}`,
        request_date: t.created_at,
        data: t
      })));
    }

    // Filter by priority if specified
    if (priority !== 'all') {
      pendingItems = pendingItems.filter(item => item.priority === priority);
    }

    // Sort by priority and date
    pendingItems.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.request_date) - new Date(b.request_date);
    });

    res.json({
      success: true,
      data: {
        pending_approvals: pendingItems,
        total: pendingItems.length
      }
    });
  } catch (error) {
    logger.error('PST pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PENDING_APPROVALS_FETCH_FAILED',
        message: 'Failed to fetch pending approvals'
      }
    });
  }
});

module.exports = router;