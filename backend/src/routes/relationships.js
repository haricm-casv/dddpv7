const express = require('express');
const { body, param, validationResult } = require('express-validator');
const models = require('../models');
const { authenticate, authorize, canApprove } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/relationships/ownership
 * @desc Get ownership relationships for current user or all (admin)
 * @access Private
 */
router.get('/ownership', authenticate, async (req, res) => {
  try {
    const { user_id, apartment_id, is_active = 'true' } = req.query;

    const whereClause = {};

    // Regular users can only see their own relationships
    if (req.user.permissions.maxPermissionLevel < 70) {
      whereClause.user_id = req.user.id;
    } else if (user_id) {
      whereClause.user_id = user_id;
    }

    if (apartment_id) {
      whereClause.apartment_id = apartment_id;
    }

    if (is_active !== 'all') {
      whereClause.is_active = is_active === 'true';
    }

    const ownerships = await models.OwnershipRelationship.findAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'mobile_number']
        },
        {
          model: models.Apartment,
          attributes: ['id', 'floor_number', 'unit_type', 'unit_number', 'square_footage']
        }
      ],
      order: [['start_date', 'DESC']]
    });

    res.json({
      success: true,
      data: { ownerships }
    });
  } catch (error) {
    logger.error('Get ownership relationships error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OWNERSHIP_FETCH_FAILED',
        message: 'Failed to fetch ownership relationships'
      }
    });
  }
});

/**
 * @route GET /api/v1/relationships/tenancy
 * @desc Get tenant relationships for current user or all (admin)
 * @access Private
 */
router.get('/tenancy', authenticate, async (req, res) => {
  try {
    const { user_id, apartment_id, is_active = 'true' } = req.query;

    const whereClause = {};

    // Regular users can only see their own relationships
    if (req.user.permissions.maxPermissionLevel < 70) {
      whereClause.user_id = req.user.id;
    } else if (user_id) {
      whereClause.user_id = user_id;
    }

    if (apartment_id) {
      whereClause.apartment_id = apartment_id;
    }

    if (is_active !== 'all') {
      whereClause.is_active = is_active === 'true';
    }

    const tenancies = await models.TenantRelationship.findAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'mobile_number']
        },
        {
          model: models.Apartment,
          attributes: ['id', 'floor_number', 'unit_type', 'unit_number', 'square_footage']
        }
      ],
      order: [['lease_start_date', 'DESC']]
    });

    res.json({
      success: true,
      data: { tenancies }
    });
  } catch (error) {
    logger.error('Get tenant relationships error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANCY_FETCH_FAILED',
        message: 'Failed to fetch tenant relationships'
      }
    });
  }
});

/**
 * @route POST /api/v1/relationships/ownership
 * @desc Create ownership relationship (admin/PST approval required)
 * @access Private
 */
router.post('/ownership', authenticate, [
  body('user_id').isInt().withMessage('User ID is required'),
  body('apartment_id').isInt().withMessage('Apartment ID is required'),
  body('ownership_percentage').isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
  body('start_date').optional().isISO8601().withMessage('Invalid start date')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

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

    const { user_id, apartment_id, ownership_percentage, start_date } = req.body;

    // Check if user and apartment exist
    const user = await models.User.findByPk(user_id, { transaction });
    const apartment = await models.Apartment.findByPk(apartment_id, { transaction });

    if (!user || !apartment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_OR_APARTMENT_NOT_FOUND',
          message: 'User or apartment not found'
        }
      });
    }

    // Check if user already has an active ownership relationship with this apartment
    const existingOwnership = await models.OwnershipRelationship.findOne({
      where: {
        user_id,
        apartment_id,
        is_active: true
      },
      transaction
    });

    if (existingOwnership) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: {
          code: 'OWNERSHIP_EXISTS',
          message: 'User already has an active ownership relationship with this apartment'
        }
      });
    }

    // Check occupancy limit: max 2 owners per apartment
    const currentOwnersCount = await models.OwnershipRelationship.count({
      where: {
        apartment_id,
        is_active: true
      },
      transaction
    });

    if (currentOwnersCount >= 2) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: {
          code: 'APARTMENT_FULL_OWNERS',
          message: 'Apartment already has maximum number of owners (2)'
        }
      });
    }

    // Check ownership percentage validation: total must equal 100%
    const currentTotalPercentage = await models.OwnershipRelationship.sum('ownership_percentage', {
      where: {
        apartment_id,
        is_active: true
      },
      transaction
    }) || 0;

    const newTotalPercentage = currentTotalPercentage + ownership_percentage;

    if (newTotalPercentage > 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'OWNERSHIP_PERCENTAGE_EXCEEDS',
          message: `Ownership percentage would make total ${newTotalPercentage}%, which exceeds 100%`
        }
      });
    }

    // If there are existing owners, the new percentage must make total exactly 100%
    if (currentOwnersCount > 0 && newTotalPercentage !== 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'OWNERSHIP_PERCENTAGE_INVALID',
          message: `With existing owners, new ownership percentage must make total exactly 100%. Current total: ${currentTotalPercentage}%, new total would be: ${newTotalPercentage}%`
        }
      });
    }

    // For non-admin users, create pending relationship requiring approval
    const isAdmin = req.user.permissions.maxPermissionLevel >= 80;
    const approved_by_user_id = isAdmin ? req.user.id : null;
    const approved_by_role = isAdmin ? 'Admin' : null;
    const approved_at = isAdmin ? new Date() : null;

    const ownership = await models.OwnershipRelationship.create({
      user_id,
      apartment_id,
      ownership_percentage,
      start_date: start_date || new Date().toISOString().split('T')[0],
      approved_by_user_id,
      approved_by_role,
      approved_at
    }, { transaction });

    // Log audit for ownership creation
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'INSERT',
      table_name: 'ownership_relationships',
      record_id: ownership.id,
      new_value: {
        user_id,
        apartment_id,
        ownership_percentage,
        start_date: ownership.start_date,
        approved_by_user_id: ownership.approved_by_user_id,
        approved_by_role: ownership.approved_by_role
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: req.user.permissions.maxPermissionLevel >= 80 ? 'Admin' : 'User'
    }, { transaction });

    await transaction.commit();

    logger.info(`Ownership relationship created: User ${user.full_name} - Apartment ${apartment.getDisplayName()} (${ownership_percentage}%)`);

    res.status(201).json({
      success: true,
      message: isAdmin ? 'Ownership relationship created successfully' : 'Ownership relationship submitted for approval',
      data: { ownership }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create ownership relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OWNERSHIP_CREATE_FAILED',
        message: 'Failed to create ownership relationship'
      }
    });
  }
});

/**
 * @route POST /api/v1/relationships/tenancy
 * @desc Create tenant relationship (admin/PST approval required)
 * @access Private
 */
router.post('/tenancy', authenticate, [
  body('user_id').isInt().withMessage('User ID is required'),
  body('apartment_id').isInt().withMessage('Apartment ID is required'),
  body('lease_start_date').isISO8601().withMessage('Lease start date is required'),
  body('lease_end_date').isISO8601().withMessage('Lease end date is required'),
  body('is_auto_renew').optional().isBoolean().withMessage('Auto renew must be a boolean')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

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

    const { user_id, apartment_id, lease_start_date, lease_end_date, is_auto_renew = false } = req.body;

    // Validate lease dates
    const startDate = new Date(lease_start_date);
    const endDate = new Date(lease_end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LEASE_DATES',
          message: 'Lease end date must be after start date'
        }
      });
    }

    // Check if user and apartment exist
    const user = await models.User.findByPk(user_id, { transaction });
    const apartment = await models.Apartment.findByPk(apartment_id, { transaction });

    if (!user || !apartment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_OR_APARTMENT_NOT_FOUND',
          message: 'User or apartment not found'
        }
      });
    }

    // Check occupancy limit: max 2 tenants per apartment
    const currentTenantsCount = await models.TenantRelationship.count({
      where: {
        apartment_id,
        is_active: true
      },
      transaction
    });

    if (currentTenantsCount >= 2) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: {
          code: 'APARTMENT_FULL_TENANTS',
          message: 'Apartment already has maximum number of tenants (2)'
        }
      });
    }

    // For non-admin users, create pending relationship requiring approval
    const isAdmin = req.user.permissions.maxPermissionLevel >= 80;
    const approved_by_user_id = isAdmin ? req.user.id : null;
    const approved_by_role = isAdmin ? 'Admin' : null;
    const approved_at = isAdmin ? new Date() : null;

    const tenancy = await models.TenantRelationship.create({
      user_id,
      apartment_id,
      lease_start_date,
      lease_end_date,
      is_auto_renew,
      approved_by_user_id,
      approved_by_role,
      approved_at
    }, { transaction });

    await transaction.commit();

    logger.info(`Tenant relationship created: User ${user.full_name} - Apartment ${apartment.getDisplayName()} (${lease_start_date} to ${lease_end_date})`);

    res.status(201).json({
      success: true,
      message: isAdmin ? 'Tenant relationship created successfully' : 'Tenant relationship submitted for approval',
      data: { tenancy }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create tenant relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANCY_CREATE_FAILED',
        message: 'Failed to create tenant relationship'
      }
    });
  }
});

/**
 * @route PUT /api/v1/relationships/ownership/:id/approve
 * @desc Approve ownership relationship (PST/Admin only)
 * @access Private (PST/Admin)
 */
router.put('/ownership/:id/approve', authenticate, canApprove, [
  param('id').isInt().withMessage('Invalid relationship ID')
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

    const ownership = await models.OwnershipRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ]
    });

    if (!ownership) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OWNERSHIP_NOT_FOUND',
          message: 'Ownership relationship not found'
        }
      });
    }

    if (ownership.approved_at) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_APPROVED',
          message: 'Ownership relationship is already approved'
        }
      });
    }

    // Get user's highest role for approval
    const userRoles = await models.UserRole.findAll({
      where: {
        user_id: req.user.id,
        is_active: true
      },
      include: [{ model: models.Role }]
    });

    const highestRole = userRoles.reduce((max, ur) =>
      ur.Role.permission_level > max.permission_level ? ur.Role : max,
      { permission_level: 0 }
    );

    await ownership.update({
      approved_by_user_id: req.user.id,
      approved_by_role: highestRole.role_name,
      approved_at: new Date()
    });

    logger.info(`Ownership relationship approved: ${ownership.User.full_name} - ${ownership.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Ownership relationship approved successfully',
      data: { ownership }
    });
  } catch (error) {
    logger.error('Approve ownership relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OWNERSHIP_APPROVE_FAILED',
        message: 'Failed to approve ownership relationship'
      }
    });
  }
});

/**
 * @route PUT /api/v1/relationships/tenancy/:id/approve
 * @desc Approve tenant relationship (PST/Admin only)
 * @access Private (PST/Admin)
 */
router.put('/tenancy/:id/approve', authenticate, canApprove, [
  param('id').isInt().withMessage('Invalid relationship ID')
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

    const tenancy = await models.TenantRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ]
    });

    if (!tenancy) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANCY_NOT_FOUND',
          message: 'Tenant relationship not found'
        }
      });
    }

    if (tenancy.approved_at) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_APPROVED',
          message: 'Tenant relationship is already approved'
        }
      });
    }

    // Get user's highest role for approval
    const userRoles = await models.UserRole.findAll({
      where: {
        user_id: req.user.id,
        is_active: true
      },
      include: [{ model: models.Role }]
    });

    const highestRole = userRoles.reduce((max, ur) =>
      ur.Role.permission_level > max.permission_level ? ur.Role : max,
      { permission_level: 0 }
    );

    await tenancy.update({
      approved_by_user_id: req.user.id,
      approved_by_role: highestRole.role_name,
      approved_at: new Date()
    });

    // Log audit for tenant approval
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'tenant_relationships',
      record_id: tenancy.id,
      old_value: {
        approved_by_user_id: null,
        approved_by_role: null,
        approved_at: null
      },
      new_value: {
        approved_by_user_id: req.user.id,
        approved_by_role: highestRole.role_name,
        approved_at: new Date()
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: highestRole.role_name
    });

    logger.info(`Tenant relationship approved: ${tenancy.User.full_name} - ${tenancy.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Tenant relationship approved successfully',
      data: { tenancy }
    });
  } catch (error) {
    logger.error('Approve tenant relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANCY_APPROVE_FAILED',
        message: 'Failed to approve tenant relationship'
      }
    });
  }
});

/**
 * @route PUT /api/v1/relationships/tenancy/:id/extend
 * @desc Extend tenant lease period (PST/Admin only)
 * @access Private (PST/Admin)
 */
router.put('/tenancy/:id/extend', authenticate, canApprove, [
  param('id').isInt().withMessage('Invalid relationship ID'),
  body('new_end_date').isISO8601().withMessage('New end date is required'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be max 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
/**
 * @route PUT /api/v1/relationships/ownership/:id
 * @desc Update ownership relationship (admin/PST only)
 * @access Private (Admin/PST)
 */
router.put('/ownership/:id', authenticate, authorize, [
  param('id').isInt().withMessage('Invalid relationship ID'),
  body('ownership_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

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
    const { ownership_percentage, end_date } = req.body;

    const ownership = await models.OwnershipRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!ownership) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'OWNERSHIP_NOT_FOUND',
          message: 'Ownership relationship not found'
        }
      });
    }

    // Check if user has permission to update
    const isAdmin = req.user.permissions.maxPermissionLevel >= 80;
    const isPST = req.user.permissions.maxPermissionLevel >= 70;

    if (!isAdmin && !isPST) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Admin or PST members can update ownership relationships'
        }
      });
    }

    const oldValues = {
      ownership_percentage: ownership.ownership_percentage,
      end_date: ownership.end_date
    };

    // If updating percentage, validate total ownership
    if (ownership_percentage !== undefined) {
      const currentTotalPercentage = await models.OwnershipRelationship.sum('ownership_percentage', {
        where: {
          apartment_id: ownership.apartment_id,
          is_active: true,
          id: { [models.Sequelize.Op.ne]: id }
        },
        transaction
      }) || 0;

      const newTotalPercentage = currentTotalPercentage + ownership_percentage;

      if (newTotalPercentage !== 100) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            code: 'OWNERSHIP_PERCENTAGE_INVALID',
            message: `Total ownership percentage must equal 100%. Current total with other owners: ${currentTotalPercentage}%, new total would be: ${newTotalPercentage}%`
          }
        });
      }
    }

    await ownership.update({
      ownership_percentage: ownership_percentage !== undefined ? ownership_percentage : ownership.ownership_percentage,
      end_date: end_date !== undefined ? end_date : ownership.end_date
    }, { transaction });

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'ownership_relationships',
      record_id: id,
      old_value: oldValues,
      new_value: {
        ownership_percentage: ownership.ownership_percentage,
        end_date: ownership.end_date
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: isAdmin ? 'Admin' : 'PST'
    }, { transaction });

    await transaction.commit();

    logger.info(`Ownership relationship updated: ${ownership.User.full_name} - ${ownership.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Ownership relationship updated successfully',
      data: { ownership }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Update ownership relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OWNERSHIP_UPDATE_FAILED',
        message: 'Failed to update ownership relationship'
      }
    });
  }
});

/**
 * @route DELETE /api/v1/relationships/ownership/:id
 * @desc Delete ownership relationship (admin only)
 * @access Private (Admin)
 */
router.delete('/ownership/:id', authenticate, authorize, [
  param('id').isInt().withMessage('Invalid relationship ID')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { id } = req.params;

    const ownership = await models.OwnershipRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!ownership) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'OWNERSHIP_NOT_FOUND',
          message: 'Ownership relationship not found'
        }
      });
    }

    // Check if user is admin
    if (req.user.permissions.maxPermissionLevel < 80) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Admin can delete ownership relationships'
        }
      });
    }

    // Check if this would leave the apartment without owners
    const otherOwnersCount = await models.OwnershipRelationship.count({
      where: {
        apartment_id: ownership.apartment_id,
        is_active: true,
        id: { [models.Sequelize.Op.ne]: id }
      },
      transaction
    });

    if (otherOwnersCount === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_LAST_OWNER',
          message: 'Cannot delete the last ownership relationship for an apartment'
        }
      });
    }

    const oldValues = {
      user_id: ownership.user_id,
      apartment_id: ownership.apartment_id,
      ownership_percentage: ownership.ownership_percentage,
      start_date: ownership.start_date,
      end_date: ownership.end_date,
      is_active: ownership.is_active
    };

    await ownership.destroy({ transaction });

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE',
      table_name: 'ownership_relationships',
      record_id: id,
      old_value: oldValues,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: 'Admin'
    }, { transaction });

    await transaction.commit();

    logger.info(`Ownership relationship deleted: ${ownership.User.full_name} - ${ownership.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Ownership relationship deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Delete ownership relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OWNERSHIP_DELETE_FAILED',
        message: 'Failed to delete ownership relationship'
      }
    });
  }
});

/**
 * @route PUT /api/v1/relationships/tenancy/:id
 * @desc Update tenant relationship (admin/PST only)
 * @access Private (Admin/PST)
 */
router.put('/tenancy/:id', authenticate, authorize, [
  param('id').isInt().withMessage('Invalid relationship ID'),
  body('lease_start_date').optional().isISO8601().withMessage('Invalid lease start date'),
  body('lease_end_date').optional().isISO8601().withMessage('Invalid lease end date'),
  body('is_auto_renew').optional().isBoolean().withMessage('Auto renew must be a boolean')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

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
    const { lease_start_date, lease_end_date, is_auto_renew } = req.body;

    const tenancy = await models.TenantRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!tenancy) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANCY_NOT_FOUND',
          message: 'Tenant relationship not found'
        }
      });
    }

    // Check if user has permission to update
    const isAdmin = req.user.permissions.maxPermissionLevel >= 80;
    const isPST = req.user.permissions.maxPermissionLevel >= 70;

    if (!isAdmin && !isPST) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Admin or PST members can update tenant relationships'
        }
      });
    }

    // Validate lease dates if provided
    if (lease_start_date && lease_end_date) {
      const startDate = new Date(lease_start_date);
      const endDate = new Date(lease_end_date);

      if (startDate >= endDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LEASE_DATES',
            message: 'Lease end date must be after start date'
          }
        });
      }
    }

    const oldValues = {
      lease_start_date: tenancy.lease_start_date,
      lease_end_date: tenancy.lease_end_date,
      is_auto_renew: tenancy.is_auto_renew
    };

    await tenancy.update({
      lease_start_date: lease_start_date !== undefined ? lease_start_date : tenancy.lease_start_date,
      lease_end_date: lease_end_date !== undefined ? lease_end_date : tenancy.lease_end_date,
      is_auto_renew: is_auto_renew !== undefined ? is_auto_renew : tenancy.is_auto_renew,
      modified_by_pst: isPST
    }, { transaction });

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'tenant_relationships',
      record_id: id,
      old_value: oldValues,
      new_value: {
        lease_start_date: tenancy.lease_start_date,
        lease_end_date: tenancy.lease_end_date,
        is_auto_renew: tenancy.is_auto_renew,
        modified_by_pst: tenancy.modified_by_pst
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: isAdmin ? 'Admin' : 'PST'
    }, { transaction });

    await transaction.commit();

    logger.info(`Tenant relationship updated: ${tenancy.User.full_name} - ${tenancy.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Tenant relationship updated successfully',
      data: { tenancy }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Update tenant relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANCY_UPDATE_FAILED',
        message: 'Failed to update tenant relationship'
      }
    });
  }
});

/**
 * @route DELETE /api/v1/relationships/tenancy/:id
 * @desc Delete tenant relationship (admin only)
 * @access Private (Admin)
 */
router.delete('/tenancy/:id', authenticate, authorize, [
  param('id').isInt().withMessage('Invalid relationship ID')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

  try {
    const { id } = req.params;

    const tenancy = await models.TenantRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!tenancy) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANCY_NOT_FOUND',
          message: 'Tenant relationship not found'
        }
      });
    }

    // Check if user is admin
    if (req.user.permissions.maxPermissionLevel < 80) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Admin can delete tenant relationships'
        }
      });
    }

    const oldValues = {
      user_id: tenancy.user_id,
      apartment_id: tenancy.apartment_id,
      lease_start_date: tenancy.lease_start_date,
      lease_end_date: tenancy.lease_end_date,
      is_auto_renew: tenancy.is_auto_renew,
      is_active: tenancy.is_active
    };

    await tenancy.destroy({ transaction });

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE',
      table_name: 'tenant_relationships',
      record_id: id,
      old_value: oldValues,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: 'Admin'
    }, { transaction });

    await transaction.commit();

    logger.info(`Tenant relationship deleted: ${tenancy.User.full_name} - ${tenancy.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Tenant relationship deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Delete tenant relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANCY_DELETE_FAILED',
        message: 'Failed to delete tenant relationship'
      }
    });
  }
});
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const { new_end_date, reason } = req.body;

    const tenancy = await models.TenantRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!tenancy) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANCY_NOT_FOUND',
          message: 'Tenant relationship not found'
        }
      });
    }

    const currentEndDate = new Date(tenancy.lease_end_date);
    const newEndDate = new Date(new_end_date);

    if (newEndDate <= currentEndDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EXTENSION_DATE',
          message: 'New end date must be after current end date'
        }
      });
    }

    await tenancy.update({
      lease_end_date: new_end_date,
      modified_by_pst: true
    }, { transaction });

    // Log the lease extension
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'tenant_relationships',
      record_id: id,
      old_value: { lease_end_date: tenancy.lease_end_date },
      new_value: { lease_end_date: new_end_date, modified_by_pst: true },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: highestRole.role_name,
      reason: reason || 'Lease period extended by PST/Admin'
    }, { transaction });

    await transaction.commit();

    logger.info(`Lease extended: ${tenancy.User.full_name} - ${tenancy.Apartment.getDisplayName()} to ${new_end_date}`);

    res.json({
      success: true,
      message: 'Lease period extended successfully',
      data: { tenancy }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Extend lease error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEASE_EXTEND_FAILED',
        message: 'Failed to extend lease period'
      }
    });
  }
});

    const tenancy = await models.TenantRelationship.findByPk(id, {
      include: [
        { model: models.User },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!tenancy) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANCY_NOT_FOUND',
          message: 'Tenant relationship not found'
        }
      });
    }

    const currentEndDate = new Date(tenancy.lease_end_date);
    const newEndDate = new Date(new_end_date);

    if (newEndDate <= currentEndDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EXTENSION_DATE',
          message: 'New end date must be after current end date'
        }
      });
    }

    await tenancy.update({
      lease_end_date: new_end_date,
      modified_by_pst: true
    }, { transaction });

    // Log the lease extension
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'tenant_relationships',
      record_id: id,
      old_value: { lease_end_date: tenancy.lease_end_date },
      new_value: { lease_end_date: new_end_date, modified_by_pst: true },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: highestRole.role_name,
      reason: reason || 'Lease period extended by PST/Admin'
    }, { transaction });

    await transaction.commit();

    logger.info(`Lease extended: ${tenancy.User.full_name} - ${tenancy.Apartment.getDisplayName()} to ${new_end_date}`);

    res.json({
      success: true,
      message: 'Lease period extended successfully',
      data: { tenancy }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Extend lease error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEASE_EXTEND_FAILED',
/**
 * @route POST /api/v1/relationships/transfers
 * @desc Create ownership transfer request
 * @access Private
 */
router.post('/transfers', authenticate, [
  body('apartment_id').isInt().withMessage('Apartment ID is required'),
  body('from_user_id').isInt().withMessage('From user ID is required'),
  body('to_user_id').isInt().withMessage('To user ID is required'),
  body('ownership_percentage').isFloat({ min: 0.01, max: 100 }).withMessage('Ownership percentage must be between 0.01 and 100'),
  body('transfer_value').optional().isFloat({ min: 0 }).withMessage('Transfer value must be non-negative'),
  body('reason').optional().isLength({ max: 1000 }).withMessage('Reason must be max 1000 characters')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

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

    const { apartment_id, from_user_id, to_user_id, ownership_percentage, transfer_value, reason } = req.body;

    // Check if users and apartment exist
    const fromUser = await models.User.findByPk(from_user_id, { transaction });
    const toUser = await models.User.findByPk(to_user_id, { transaction });
    const apartment = await models.Apartment.findByPk(apartment_id, { transaction });

    if (!fromUser || !toUser || !apartment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_OR_APARTMENT_NOT_FOUND',
          message: 'From user, to user, or apartment not found'
        }
      });
    }

    // Check if from_user has ownership in this apartment
    const fromUserOwnership = await models.OwnershipRelationship.findOne({
      where: {
        user_id: from_user_id,
        apartment_id,
        is_active: true
      },
      transaction
    });

    if (!fromUserOwnership) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_OWNERSHIP',
          message: 'From user does not have ownership in this apartment'
        }
      });
    }

    // Check if from_user has sufficient ownership percentage
    if (fromUserOwnership.ownership_percentage < ownership_percentage) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_OWNERSHIP',
          message: `From user only has ${fromUserOwnership.ownership_percentage}% ownership, cannot transfer ${ownership_percentage}%`
        }
      });
    }

    // Check if to_user already has ownership in this apartment
    const toUserOwnership = await models.OwnershipRelationship.findOne({
      where: {
        user_id: to_user_id,
        apartment_id,
        is_active: true
      },
      transaction
    });

    if (toUserOwnership) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_OWNER',
          message: 'To user already has ownership in this apartment'
        }
      });
    }

    // Check occupancy limit for to_user
    const currentOwnersCount = await models.OwnershipRelationship.count({
      where: {
        apartment_id,
        is_active: true
      },
      transaction
    });

    if (currentOwnersCount >= 2) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: {
          code: 'APARTMENT_FULL_OWNERS',
          message: 'Apartment already has maximum number of owners (2)'
        }
      });
    }

    // Create ownership transfer request
    const transfer = await models.OwnershipTransfer.create({
      apartment_id,
      from_user_id,
      to_user_id,
      ownership_percentage,
      transfer_value: transfer_value || 0,
      request_date: new Date(),
      status: 'pending',
      reason: reason || null
    }, { transaction });

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'INSERT',
      table_name: 'ownership_transfers',
      record_id: transfer.id,
      new_value: {
        apartment_id,
        from_user_id,
        to_user_id,
        ownership_percentage,
        transfer_value: transfer_value || 0,
        status: 'pending',
        reason: reason || null
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: req.user.permissions.maxPermissionLevel >= 80 ? 'Admin' : 'User'
    }, { transaction });

    await transaction.commit();

    logger.info(`Ownership transfer requested: ${fromUser.full_name} -> ${toUser.full_name} (${ownership_percentage}%) for ${apartment.getDisplayName()}`);

    res.status(201).json({
      success: true,
      message: 'Ownership transfer request created successfully',
      data: { transfer }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create ownership transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSFER_CREATE_FAILED',
        message: 'Failed to create ownership transfer request'
      }
    });
  }
});

/**
 * @route GET /api/v1/relationships/transfers
 * @desc Get ownership transfer requests
 * @access Private
 */
router.get('/transfers', authenticate, async (req, res) => {
  try {
    const { status, user_id, apartment_id } = req.query;

    const whereClause = {};

    // Regular users can only see their own transfers
    if (req.user.permissions.maxPermissionLevel < 70) {
      whereClause[models.Sequelize.Op.or] = [
        { from_user_id: req.user.id },
        { to_user_id: req.user.id }
      ];
    } else if (user_id) {
      whereClause[models.Sequelize.Op.or] = [
        { from_user_id: user_id },
        { to_user_id: user_id }
      ];
    }

    if (apartment_id) {
      whereClause.apartment_id = apartment_id;
    }

    if (status) {
      whereClause.status = status;
    }

    const transfers = await models.OwnershipTransfer.findAll({
      where: whereClause,
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
          attributes: ['id', 'floor_number', 'unit_type', 'unit_number', 'square_footage']
        }
      ],
      order: [['request_date', 'DESC']]
    });

    res.json({
      success: true,
      data: { transfers }
    });
  } catch (error) {
    logger.error('Get ownership transfers error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSFERS_FETCH_FAILED',
        message: 'Failed to fetch ownership transfers'
      }
    });
  }
/**
 * @route PUT /api/v1/relationships/transfers/:id/approve
 * @desc Approve ownership transfer request (PST/Admin only)
 * @access Private (PST/Admin)
 */
router.put('/transfers/:id/approve', authenticate, canApprove, [
  param('id').isInt().withMessage('Invalid transfer ID'),
  body('comments').optional().isLength({ max: 1000 }).withMessage('Comments must be max 1000 characters')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

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
    const { comments } = req.body;

    const transfer = await models.OwnershipTransfer.findByPk(id, {
      include: [
        { model: models.User, as: 'fromUser' },
        { model: models.User, as: 'toUser' },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!transfer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSFER_NOT_FOUND',
          message: 'Ownership transfer request not found'
        }
      });
    }

    if (transfer.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_PROCESSED',
          message: 'This transfer request has already been processed'
        }
      });
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

    // Update transfer status
    await transfer.update({
      status: 'approved',
      approved_by_user_id: req.user.id,
      approval_date: new Date(),
      approval_comments: comments
    }, { transaction });

    // Get current ownership of from_user
    const fromUserOwnership = await models.OwnershipRelationship.findOne({
      where: {
        user_id: transfer.from_user_id,
        apartment_id: transfer.apartment_id,
        is_active: true
      },
      transaction
    });

    if (!fromUserOwnership) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'OWNERSHIP_NOT_FOUND',
          message: 'From user ownership relationship not found'
        }
      });
    }

    // Calculate new ownership percentages
    const remainingPercentage = fromUserOwnership.ownership_percentage - transfer.ownership_percentage;

    // Update from_user ownership
    if (remainingPercentage > 0) {
      await fromUserOwnership.update({
        ownership_percentage: remainingPercentage
      }, { transaction });
    } else {
      // If transferring all ownership, end the relationship
      await fromUserOwnership.update({
        is_active: false,
        end_date: new Date().toISOString().split('T')[0]
      }, { transaction });
    }

    // Create new ownership for to_user
    const toUserOwnership = await models.OwnershipRelationship.create({
      user_id: transfer.to_user_id,
      apartment_id: transfer.apartment_id,
      ownership_percentage: transfer.ownership_percentage,
      start_date: new Date().toISOString().split('T')[0],
      approved_by_user_id: req.user.id,
      approved_by_role: highestRole.role_name,
      approved_at: new Date()
    }, { transaction });

    // Update transfer with completion date
    await transfer.update({
      transfer_completion_date: new Date().toISOString().split('T')[0]
    }, { transaction });

    // Log PST committee action if applicable
    if (req.user.isPSTMember) {
      await models.PstCommitteeAction.create({
        pst_member_user_id: req.user.id,
        pst_role: req.user.pstRole,
        action_type: 'approval',
        target_table: 'ownership_transfers',
        target_record_id: id,
        action_details: {
          transfer_percentage: transfer.ownership_percentage,
          from_user: transfer.from_user_id,
          to_user: transfer.to_user_id,
          comments: comments
        },
        reason: comments || 'Ownership transfer approved'
      }, { transaction });
    }

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'ownership_transfers',
      record_id: id,
      old_value: {
        status: 'pending',
        approved_by_user_id: null,
        approval_date: null
      },
      new_value: {
        status: 'approved',
        approved_by_user_id: req.user.id,
        approval_date: new Date(),
        transfer_completion_date: transfer.transfer_completion_date
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: highestRole.role_name
    }, { transaction });

    await transaction.commit();

    logger.info(`Ownership transfer approved: ${transfer.fromUser.full_name} -> ${transfer.toUser.full_name} (${transfer.ownership_percentage}%) for ${transfer.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Ownership transfer approved successfully',
      data: { transfer, toUserOwnership }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Approve ownership transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSFER_APPROVE_FAILED',
        message: 'Failed to approve ownership transfer'
      }
    });
  }
});

/**
 * @route PUT /api/v1/relationships/transfers/:id/reject
 * @desc Reject ownership transfer request (PST/Admin only)
 * @access Private (PST/Admin)
 */
router.put('/transfers/:id/reject', authenticate, canApprove, [
  param('id').isInt().withMessage('Invalid transfer ID'),
  body('comments').isLength({ min: 1, max: 1000 }).withMessage('Rejection comments are required')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

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
    const { comments } = req.body;

    const transfer = await models.OwnershipTransfer.findByPk(id, {
      include: [
        { model: models.User, as: 'fromUser' },
        { model: models.User, as: 'toUser' },
        { model: models.Apartment }
      ],
      transaction
    });

    if (!transfer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSFER_NOT_FOUND',
          message: 'Ownership transfer request not found'
        }
      });
    }

    if (transfer.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_PROCESSED',
          message: 'This transfer request has already been processed'
        }
      });
    }

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

    // Update transfer status
    await transfer.update({
      status: 'rejected',
      approved_by_user_id: req.user.id,
      approval_date: new Date(),
      rejection_reason: comments
    }, { transaction });

    // Log PST committee action if applicable
    if (req.user.isPSTMember) {
      await models.PstCommitteeAction.create({
        pst_member_user_id: req.user.id,
        pst_role: req.user.pstRole,
        action_type: 'rejection',
        target_table: 'ownership_transfers',
        target_record_id: id,
        action_details: { comments },
        reason: comments
      }, { transaction });
    }

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'ownership_transfers',
      record_id: id,
      old_value: {
        status: 'pending',
        approved_by_user_id: null,
        approval_date: null
      },
      new_value: {
        status: 'rejected',
        approved_by_user_id: req.user.id,
        approval_date: new Date(),
        rejection_reason: comments
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: highestRole.role_name
    }, { transaction });

    await transaction.commit();

    logger.info(`Ownership transfer rejected: ${transfer.fromUser.full_name} -> ${transfer.toUser.full_name} (${transfer.ownership_percentage}%) for ${transfer.Apartment.getDisplayName()}`);

    res.json({
      success: true,
      message: 'Ownership transfer rejected successfully',
      data: { transfer }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Reject ownership transfer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSFER_REJECT_FAILED',
        message: 'Failed to reject ownership transfer'
      }
    });
  }
});

module.exports = router;