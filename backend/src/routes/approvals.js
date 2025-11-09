const express = require('express');
const { body, param, validationResult } = require('express-validator');
const models = require('../models');
const { authenticate, canApprove, canOverride, preventPSTConflict, checkInstantApproval } = require('../middleware/auth');
const logger = require('../utils/logger');
const notificationTriggers = require('../services/notificationTriggers');

const router = express.Router();

/**
 * @route GET /api/v1/approvals/pending
 * @desc Get pending approvals
 * @access Private (Approvers)
 */
router.get('/pending', authenticate, canApprove, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause based on user permissions
    const whereClause = {};

    // PST members can see all pending approvals
    // Other approvers see approvals based on their permission level
    if (!req.user.isPSTMember) {
      // Non-PST approvers can only see approvals they can handle
      // This would depend on the specific business logic
      // For now, show all pending approvals to authorized users
    }

    if (type) {
      whereClause.request_type = type;
    }

    // For ownership transfers, check status field
    if (type === 'ownership_transfer') {
      whereClause.status = 'pending';
    } else if (type === 'ownership_relationship' || type === 'tenant_relationship') {
      // For relationships, check if approved_at is null
      whereClause.approved_at = null;
    } else if (type === 'user_registration') {
      // For user registrations, check registration_approved field
      whereClause.registration_approved = false;
      whereClause.registration_approved_at = null;
    } else if (!type) {
      // If no specific type, get all pending approvals
      // This is a complex query combining multiple tables
      // For now, we'll focus on ownership transfers as example
      whereClause.status = 'pending';
    }

    let approvals = [];
    let totalCount = 0;

    // Handle different approval types
    if (type === 'ownership_transfer' || !type) {
      const { count, rows } = await models.OwnershipTransfer.findAndCountAll({
        where: type === 'ownership_transfer' ? whereClause : { status: 'pending' },
        include: [
          {
            model: models.User,
            as: 'Transferor',
            attributes: ['id', 'full_name', 'mobile_number']
          },
          {
            model: models.User,
            as: 'Transferee',
            attributes: ['id', 'full_name', 'mobile_number']
          },
          {
            model: models.Apartment,
            attributes: ['id', 'floor_number', 'unit_type', 'unit_number']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      approvals = approvals.concat(rows.map(approval => ({
        id: approval.id,
        type: 'ownership_transfer',
        request_type: 'ownership_transfer',
        approval_status: approval.status,
        transferor: approval.Transferor,
        transferee: approval.Transferee,
        apartment: approval.Apartment,
        ownership_percentage: approval.ownership_percentage,
        created_at: approval.created_at,
        can_approve: req.user.permissions.canApprove,
        can_override: req.user.permissions.canOverride,
        instant_approval: req.user.permissions.instantApproval
      })));

      totalCount += count;
    }

    if (type === 'user_registration' || !type) {
      const { count, rows } = await models.User.findAndCountAll({
        where: type === 'user_registration' ? whereClause : {
          registration_approved: false,
          registration_approved_at: null,
          is_active: true
        },
        include: [{
          model: models.Profession,
          attributes: ['name']
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      approvals = approvals.concat(rows.map(user => ({
        id: user.id,
        type: 'user_registration',
        request_type: 'user_registration',
        approval_status: 'pending',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          mobile_number: user.mobile_number,
          profession: user.Profession?.name
        },
        created_at: user.created_at,
        can_approve: req.user.permissions.canApprove,
        can_override: req.user.permissions.canOverride,
        instant_approval: req.user.permissions.instantApproval
      })));

      totalCount += count;
    }

    // Sort combined results by created_at
    approvals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination to combined results
    const startIndex = (page - 1) * limit;
    const paginatedApprovals = approvals.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        approvals: paginatedApprovals,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APPROVALS_FETCH_FAILED',
        message: 'Failed to fetch pending approvals'
      }
    });
  }
});

/**
 * @route POST /api/v1/approvals/:id/approve
 * @desc Approve a request
 * @access Private (Approvers)
 */
router.post('/:id/approve', authenticate, canApprove, preventPSTConflict, checkInstantApproval, [
  param('id').isInt().withMessage('Invalid approval ID'),
  body('comments').optional().trim().isLength({ max: 1000 }),
  body('request_type').isIn(['ownership_transfer', 'ownership_relationship', 'tenant_relationship']).withMessage('Invalid request type')
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

    const { id } = req.params;
    const { comments, request_type } = req.body;
    const approvalId = parseInt(id);

    let approvalRecord;
    let tableName;

    // Handle different approval types
    switch (request_type) {
      case 'ownership_transfer':
        approvalRecord = await models.OwnershipTransfer.findByPk(approvalId);
        tableName = 'ownership_transfers';
        break;
      case 'ownership_relationship':
        approvalRecord = await models.OwnershipRelationship.findByPk(approvalId);
        tableName = 'ownership_relationships';
        break;
      case 'tenant_relationship':
        approvalRecord = await models.TenantRelationship.findByPk(approvalId);
        tableName = 'tenant_relationships';
        break;
      case 'user_registration':
        approvalRecord = await models.User.findByPk(approvalId);
        tableName = 'users';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST_TYPE',
            message: 'Unsupported request type'
          }
        });
    }

    if (!approvalRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPROVAL_NOT_FOUND',
          message: 'Approval request not found'
        }
      });
    }

    // Check if already approved
    let isAlreadyApproved = false;
    if (request_type === 'ownership_transfer') {
      isAlreadyApproved = approvalRecord.status === 'approved';
    } else if (request_type === 'user_registration') {
      isAlreadyApproved = approvalRecord.registration_approved;
    } else {
      isAlreadyApproved = !!approvalRecord.approved_at;
    }

    if (isAlreadyApproved) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_APPROVED',
          message: 'This request has already been approved'
        }
      });
    }

    // Start transaction
    const transaction = await models.sequelize.transaction();

    try {
      // Determine approval status based on permissions
      let approvalLevel = 'standard';

      if (req.instantApproval) {
        // Level 80+ gets instant approval
        approvalLevel = 'instant';
      } else if (req.user.permissions.canOverride) {
        // President can override
        approvalLevel = 'override';
      }

      // For ownership transfers, PST instant approval means immediate completion
      if (request_type === 'ownership_transfer' && approvalLevel === 'instant') {
        // PST instant approval completes the transfer immediately
        await approvalRecord.update({
          status: 'approved',
          approved_by_user_id: req.user.id,
          approved_by_role: highestRole.role_name,
          approval_date: new Date(),
          transfer_completion_date: new Date() // Immediate completion
        }, { transaction });
      } else {
        // Update the approval record based on type
        if (request_type === 'ownership_transfer') {
          await approvalRecord.update({
            status: 'approved',
            approved_by_user_id: req.user.id,
            approved_by_role: highestRole.role_name,
            approval_date: new Date()
          }, { transaction });
        } else if (request_type === 'user_registration') {
          await approvalRecord.update({
            registration_approved: true,
            registration_approved_by_user_id: req.user.id,
            registration_approved_by_role: highestRole.role_name,
            registration_approved_at: new Date()
          }, { transaction });
        } else {
          await approvalRecord.update({
            approved_by_user_id: req.user.id,
            approved_by_role: highestRole.role_name,
            approved_at: new Date()
          }, { transaction });
        }
      }

      // Get user's highest role for approval
      const userRoles = await models.UserRole.findAll({
        where: {
          user_id: req.user.id,
          is_active: true
        },
        include: [{ model: models.Role }],
        transaction
      });

      const highestRole = userRoles.reduce((max, ur) =>
        ur.Role.permission_level > max.permission_level ? ur.Role : max,
        { permission_level: 0, role_name: 'User' }
      );

      // Update the approval record based on type
      if (request_type === 'ownership_transfer') {
        await approvalRecord.update({
          status: 'approved',
          approved_by_user_id: req.user.id,
          approved_by_role: highestRole.role_name,
          approval_date: new Date()
        }, { transaction });
      } else if (request_type === 'user_registration') {
        await approvalRecord.update({
          registration_approved: true,
          registration_approved_by_user_id: req.user.id,
          registration_approved_by_role: highestRole.role_name,
          registration_approved_at: new Date()
        }, { transaction });
      } else {
        await approvalRecord.update({
          approved_by_user_id: req.user.id,
          approved_by_role: highestRole.role_name,
          approved_at: new Date()
        }, { transaction });
      }

      // For ownership relationships, also set approval comments if provided
      if (request_type === 'ownership_relationship' && comments) {
        // Note: OwnershipRelationship might not have comments field, adjust as needed
      }

      // Log PST committee action if applicable
      if (req.user.isPSTMember) {
        await models.PstCommitteeAction.create({
          pst_member_user_id: req.user.id,
          pst_role: req.user.pstRole,
          action_type: 'approval',
          target_table: tableName,
          target_record_id: approvalId,
          action_details: {
            approval_level: approvalLevel,
            request_type: request_type,
            comments: comments,
            instant_completion: request_type === 'ownership_transfer' && approvalLevel === 'instant'
          },
          reason: comments || `Approved ${request_type} via ${approvalLevel} process`
        }, { transaction });
      }

      // Log audit
      let oldValue, newValue;
      if (request_type === 'ownership_transfer') {
        oldValue = { status: 'pending', approved_by_user_id: null };
        newValue = {
          status: 'approved',
          approved_by_user_id: req.user.id,
          approved_by_role: highestRole.role_name,
          approval_level: approvalLevel,
          transfer_completion_date: request_type === 'ownership_transfer' && approvalLevel === 'instant' ? new Date() : null
        };
      } else if (request_type === 'user_registration') {
        oldValue = { registration_approved: false, registration_approved_by_user_id: null };
        newValue = {
          registration_approved: true,
          registration_approved_by_user_id: req.user.id,
          registration_approved_by_role: highestRole.role_name,
          registration_approved_at: new Date(),
          approval_level: approvalLevel
        };
      } else {
        oldValue = { approved_at: null, approved_by_user_id: null };
        newValue = {
          approved_at: new Date(),
          approved_by_user_id: req.user.id,
          approved_by_role: highestRole.role_name,
          approval_level: approvalLevel
        };
      }

      await models.AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        table_name: tableName,
        record_id: approvalId,
        old_value: oldValue,
        new_value: newValue,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        user_role: highestRole.role_name,
        reason: comments || `Approved ${request_type}`
      }, { transaction });

      // Send notification using the notification service
      switch (request_type) {
        case 'ownership_transfer':
          await notificationTriggers.notifyTransferDecision({
            transferId: approvalRecord.id,
            fromUserId: approvalRecord.from_user_id,
            toUserId: approvalRecord.to_user_id,
            apartmentName: `${approvalRecord.Apartment?.floor_number || ''} ${approvalRecord.Apartment?.unit_type || ''}`.trim() || 'Unknown',
            percentage: approvalRecord.ownership_percentage || 100,
            instantCompletion: approvalLevel === 'instant'
          }, 'approved', {
            id: req.user.id,
            role: highestRole.role_name,
            name: req.user.full_name
          });
          break;
        case 'user_registration':
          await notificationTriggers.notifyRegistrationDecision(approvalRecord.id, 'approved', {
            userId: req.user.id,
            role: highestRole.role_name,
            name: req.user.full_name
          });
          break;
        case 'ownership_relationship':
          // Generic approval notification for ownership relationships
          await models.Notification.create({
            user_id: approvalRecord.user_id,
            notification_type: 'approval',
            title: 'Ownership Request Approved',
            message: `Your ownership request has been approved by ${highestRole.role_name}.`,
            priority: 'high',
            sent_by_user_id: req.user.id,
            sent_by_role: highestRole.role_name
          }, { transaction });
          break;
        case 'tenant_relationship':
          // Generic approval notification for tenant relationships
          await models.Notification.create({
            user_id: approvalRecord.user_id,
            notification_type: 'approval',
            title: 'Tenancy Request Approved',
            message: `Your tenancy request has been approved by ${highestRole.role_name}.`,
            priority: 'high',
            sent_by_user_id: req.user.id,
            sent_by_role: highestRole.role_name
          }, { transaction });
          break;
      }

      await transaction.commit();

      logger.info(`${request_type} #${approvalId} approved by ${req.user.full_name} (${approvalLevel})`);

      res.json({
        success: true,
        message: 'Request approved successfully',
        data: {
          approval: {
            id: approvalRecord.id,
            type: request_type,
            approved_by: req.user.full_name,
            approved_by_role: highestRole.role_name,
            approved_at: new Date(),
            approval_level: approvalLevel
          }
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APPROVAL_FAILED',
        message: 'Failed to process approval'
      }
    });
  }
});

/**
 * @route POST /api/v1/approvals/:id/reject
 * @desc Reject a request
 * @access Private (Approvers)
 */
router.post('/:id/reject', authenticate, canApprove, preventPSTConflict, [
  param('id').isInt().withMessage('Invalid approval ID'),
  body('comments').trim().isLength({ min: 1, max: 1000 }).withMessage('Rejection comments are required'),
  body('request_type').isIn(['ownership_transfer', 'ownership_relationship', 'tenant_relationship']).withMessage('Invalid request type')
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

    const { id } = req.params;
    const { comments, request_type } = req.body;
    const approvalId = parseInt(id);

    let approvalRecord;
    let tableName;

    // Handle different approval types
    switch (request_type) {
      case 'ownership_transfer':
        approvalRecord = await models.OwnershipTransfer.findByPk(approvalId);
        tableName = 'ownership_transfers';
        break;
      case 'ownership_relationship':
        approvalRecord = await models.OwnershipRelationship.findByPk(approvalId);
        tableName = 'ownership_relationships';
        break;
      case 'tenant_relationship':
        approvalRecord = await models.TenantRelationship.findByPk(approvalId);
        tableName = 'tenant_relationships';
        break;
      case 'user_registration':
        approvalRecord = await models.User.findByPk(approvalId);
        tableName = 'users';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST_TYPE',
            message: 'Unsupported request type'
          }
        });
    }

    if (!approvalRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPROVAL_NOT_FOUND',
          message: 'Approval request not found'
        }
      });
    }

    // Check if already approved
    let isAlreadyApproved = false;
    if (request_type === 'ownership_transfer') {
      isAlreadyApproved = approvalRecord.status === 'approved';
    } else if (request_type === 'user_registration') {
      isAlreadyApproved = approvalRecord.registration_approved;
    } else {
      isAlreadyApproved = !!approvalRecord.approved_at;
    }

    if (isAlreadyApproved) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_APPROVED',
          message: 'This request has already been approved'
        }
      });
    }

    // Start transaction
    const transaction = await models.sequelize.transaction();

    try {
      // Get user's highest role for rejection
      const userRoles = await models.UserRole.findAll({
        where: {
          user_id: req.user.id,
          is_active: true
        },
        include: [{ model: models.Role }],
        transaction
      });

      const highestRole = userRoles.reduce((max, ur) =>
        ur.Role.permission_level > max.permission_level ? ur.Role : max,
        { permission_level: 0, role_name: 'User' }
      );

      // Update the approval record - different fields for different types
      if (request_type === 'ownership_transfer') {
        await approvalRecord.update({
          status: 'rejected',
          approved_by_user_id: req.user.id,
          approval_date: new Date(),
          rejection_reason: comments
        }, { transaction });
      } else if (request_type === 'user_registration') {
        await approvalRecord.update({
          registration_approved: false,
          registration_approved_by_user_id: req.user.id,
          registration_approved_by_role: highestRole.role_name,
          registration_approved_at: new Date(),
          registration_rejection_reason: comments
        }, { transaction });
      } else {
        // For relationships, we might need to deactivate or add rejection fields
        // For now, we'll assume they have approved_at field and we set it to indicate rejection
        // In a real implementation, you might want to add rejection fields to these tables
        await approvalRecord.update({
          approved_by_user_id: req.user.id,
          approved_by_role: highestRole.role_name,
          approved_at: new Date()
        }, { transaction });
      }

      // Log PST committee action if applicable
      if (req.user.isPSTMember) {
        await models.PstCommitteeAction.create({
          pst_member_user_id: req.user.id,
          pst_role: req.user.pstRole,
          action_type: 'rejection',
          target_table: tableName,
          target_record_id: approvalId,
          action_details: {
            request_type: request_type,
            comments: comments
          },
          reason: comments
        }, { transaction });
      }

      // Log audit
      let oldValue, newValue;
      if (request_type === 'ownership_transfer') {
        oldValue = { status: 'pending', approved_by_user_id: null };
        newValue = {
          status: 'rejected',
          approved_by_user_id: req.user.id,
          rejection_reason: comments
        };
      } else if (request_type === 'user_registration') {
        oldValue = { registration_approved: false, registration_approved_by_user_id: null };
        newValue = {
          registration_approved: false,
          registration_approved_by_user_id: req.user.id,
          registration_approved_by_role: highestRole.role_name,
          registration_rejection_reason: comments
        };
      } else {
        oldValue = { approved_at: null, approved_by_user_id: null };
        newValue = {
          approved_at: new Date(),
          approved_by_user_id: req.user.id,
          approved_by_role: highestRole.role_name,
          rejection_reason: comments
        };
      }

      await models.AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        table_name: tableName,
        record_id: approvalId,
        old_value: oldValue,
        new_value: newValue,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        user_role: highestRole.role_name,
        reason: comments
      }, { transaction });

      // Send notification using the notification service
      switch (request_type) {
        case 'ownership_transfer':
          await notificationTriggers.notifyTransferDecision({
            transferId: approvalRecord.id,
            fromUserId: approvalRecord.from_user_id,
            toUserId: approvalRecord.to_user_id,
            apartmentName: `${approvalRecord.Apartment?.floor_number || ''} ${approvalRecord.Apartment?.unit_type || ''}`.trim() || 'Unknown',
            percentage: approvalRecord.ownership_percentage || 100
          }, 'rejected', {
            id: req.user.id,
            role: highestRole.role_name,
            name: req.user.full_name
          });
          break;
        case 'user_registration':
          await notificationTriggers.notifyRegistrationDecision(approvalRecord.id, 'rejected', {
            userId: req.user.id,
            role: highestRole.role_name,
            name: req.user.full_name,
            reason: comments
          });
          break;
        case 'ownership_relationship':
          // Generic rejection notification for ownership relationships
          await models.Notification.create({
            user_id: approvalRecord.user_id,
            notification_type: 'rejection',
            title: 'Ownership Request Rejected',
            message: `Your ownership request has been rejected by ${highestRole.role_name}. Reason: ${comments}`,
            priority: 'medium',
            sent_by_user_id: req.user.id,
            sent_by_role: highestRole.role_name
          }, { transaction });
          break;
        case 'tenant_relationship':
          // Generic rejection notification for tenant relationships
          await models.Notification.create({
            user_id: approvalRecord.user_id,
            notification_type: 'rejection',
            title: 'Tenancy Request Rejected',
            message: `Your tenancy request has been rejected by ${highestRole.role_name}. Reason: ${comments}`,
            priority: 'medium',
            sent_by_user_id: req.user.id,
            sent_by_role: highestRole.role_name
          }, { transaction });
          break;
      }

      await transaction.commit();

      logger.info(`${request_type} #${approvalId} rejected by ${req.user.full_name}`);

      res.json({
        success: true,
        message: 'Request rejected successfully',
        data: {
          approval: {
            id: approvalRecord.id,
            type: request_type,
            rejected_by: req.user.full_name,
            rejected_by_role: highestRole.role_name,
            rejected_at: new Date(),
            comments: comments
          }
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REJECTION_FAILED',
        message: 'Failed to process rejection'
      }
    });
  }
});

/**
 * @route GET /api/v1/approvals/history
 * @desc Get approval history
 * @access Private (Approvers)
 */
router.get('/history', authenticate, canApprove, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (status) {
      whereClause.approval_status = status;
    }

    if (type) {
      whereClause.request_type = type;
    }

    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[models.Sequelize.Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[models.Sequelize.Op.lte] = new Date(date_to);
    }

    // Get approval history - combine PST actions and audit logs
    const pstActions = await models.PstCommitteeAction.findAndCountAll({
      where: {
        pst_member_user_id: req.user.id
      },
      include: [{
        model: models.User,
        attributes: ['id', 'full_name']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Also get audit logs for approvals
    const auditLogs = await models.AuditLog.findAndCountAll({
      where: {
        user_id: req.user.id,
        action: 'UPDATE',
        table_name: ['ownership_transfers', 'users', 'ownership_relationships', 'tenant_relationships']
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Combine and sort by date
    const combinedHistory = [
      ...pstActions.rows.map(action => ({
        id: `pst_${action.id}`,
        type: 'pst_action',
        action: action.action_type,
        table: action.target_table,
        record_id: action.target_record_id,
        details: action.action_details,
        reason: action.reason,
        created_at: action.created_at,
        user: action.User
      })),
      ...auditLogs.rows.map(log => ({
        id: `audit_${log.id}`,
        type: 'audit_log',
        action: log.action,
        table: log.table_name,
        record_id: log.record_id,
        old_value: log.old_value,
        new_value: log.new_value,
        reason: log.reason,
        created_at: log.created_at
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination to combined results
    const startIndex = (page - 1) * limit;
    const paginatedHistory = combinedHistory.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        history: paginatedHistory,
        pagination: {
          total: pstActions.count + auditLogs.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((pstActions.count + auditLogs.count) / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HISTORY_FETCH_FAILED',
        message: 'Failed to fetch approval history'
      }
    });
  }
});

module.exports = router;