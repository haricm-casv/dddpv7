const express = require('express');
const { body, param, validationResult } = require('express-validator');
const models = require('../models');
const { hashPassword } = require('../utils/auth');
const { authenticate, authorize, canApprove, preventPSTConflict } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/users
 * @desc Get all users (admin only)
 * @access Private (Admin)
 */
router.get('/', authenticate, authorize(70), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, is_active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[models.Sequelize.Op.or] = [
        { full_name: { [models.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [models.Sequelize.Op.iLike]: `%${search}%` } },
        { mobile_number: { [models.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const includeClause = [{
      model: models.Role,
      through: { attributes: [] },
      where: role ? { role_name: { [models.Sequelize.Op.iLike]: `%${role}%` } } : undefined,
      required: !!role
    }];

    const { count, rows: users } = await models.User.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash'] }
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USERS_FETCH_FAILED',
        message: 'Failed to fetch users'
      }
    });
  }
});

/**
 * @route GET /api/v1/users/:id
 * @desc Get user by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can view their own profile or admins can view any profile
    if (req.user.id !== parseInt(id) && !req.user.permissions.canApprove) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only view your own profile'
        }
      });
    }

    const user = await models.User.findByPk(id, {
      include: [{
        model: models.Role,
        through: { attributes: [] },
        where: { is_active: true },
        required: false
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_FETCH_FAILED',
        message: 'Failed to fetch user'
      }
    });
  }
});

/**
 * @route PUT /api/v1/users/:id
 * @desc Update user profile with enhanced validation and relationship management
 * @access Private
 */
router.put('/:id', authenticate, [
  param('id').isInt().withMessage('Invalid user ID'),
  // Personal Information
  body('full_name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Full name must be between 2 and 200 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('mobile_number').optional().isMobilePhone().withMessage('Please provide a valid mobile number'),

  // Profession
  body('profession_id').optional().isInt().withMessage('Invalid profession ID'),
  body('custom_profession').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Custom profession must be between 2 and 100 characters'),

  // Emergency Contact
  body('emergency_contact_name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Emergency contact name must be between 2 and 200 characters'),
  body('emergency_contact_number').optional().isMobilePhone().withMessage('Please provide a valid emergency contact number'),

  // Additional fields
  body('alternate_contact').optional().isMobilePhone().withMessage('Please provide a valid alternate contact number'),
  body('vehicle_info').optional().isLength({ max: 1000 }).withMessage('Vehicle info must not exceed 1000 characters'),
  body('profile_photo_url').optional().isURL().withMessage('Please provide a valid photo URL')
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
    const userId = parseInt(id);
    const {
      full_name, email, mobile_number, profession_id, custom_profession,
      emergency_contact_name, emergency_contact_number,
      alternate_contact, vehicle_info, profile_photo_url
    } = req.body;

    // Users can update their own profile or admins can update any profile
    if (req.user.id !== userId && req.user.permissions.maxPermissionLevel < 70) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only update your own profile'
        }
      });
    }

    const user = await models.User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Handle custom profession
    let finalProfessionId = profession_id || user.profession_id;
    if (custom_profession && !profession_id) {
      // Check if custom profession already exists
      let customProfession = await models.Profession.findOne({
        where: { name: custom_profession, is_custom: true },
        transaction
      });

      if (!customProfession) {
        customProfession = await models.Profession.create({
          name: custom_profession,
          is_custom: true
        }, { transaction });
      }
      finalProfessionId = customProfession.id;
    }

    // Check for email/mobile conflicts if being updated
    if (email && email !== user.email) {
      const existingUser = await models.User.findOne({
        where: { email },
        transaction
      });
      if (existingUser && existingUser.id !== userId) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email address is already in use'
          }
        });
      }
    }

    if (mobile_number && mobile_number !== user.mobile_number) {
      const existingUser = await models.User.findOne({
        where: { mobile_number },
        transaction
      });
      if (existingUser && existingUser.id !== userId) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          error: {
            code: 'MOBILE_EXISTS',
            message: 'Mobile number is already in use'
          }
        });
      }
    }

    const updateData = {};
    const allowedFields = [
      'full_name', 'email', 'mobile_number',
      'emergency_contact_name', 'emergency_contact_number',
      'alternate_contact', 'vehicle_info', 'profile_photo_url'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    updateData.profession_id = finalProfessionId;

    await user.update(updateData, { transaction });

    await transaction.commit();

    logger.info(`User profile updated: ${user.full_name} (${userId})`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          mobile_number: user.mobile_number,
          profession_id: user.profession_id,
          emergency_contact_name: user.emergency_contact_name,
          emergency_contact_number: user.emergency_contact_number,
          alternate_contact: user.alternate_contact,
          vehicle_info: user.vehicle_info,
          profile_photo_url: user.profile_photo_url
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_UPDATE_FAILED',
        message: 'Failed to update user profile'
      }
    });
  }
});

/**
 * @route PUT /api/v1/users/:id/password
 * @desc Change user password
 * @access Private
 */
router.put('/:id/password', authenticate, [
  param('id').isInt().withMessage('Invalid user ID'),
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
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
    const userId = parseInt(id);
    const { current_password, new_password } = req.body;

    // Users can change their own password or admins can change any password
    if (req.user.id !== userId && req.user.permissions.maxPermissionLevel < 70) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only change your own password'
        }
      });
    }

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Verify current password (skip for admin changes)
    if (req.user.id === userId) {
      const { comparePassword } = require('../utils/auth');
      const isValidPassword = await comparePassword(current_password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect'
          }
        });
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    await user.update({
      password_hash: newPasswordHash,
      must_reset_password: false
    });

    logger.info(`Password changed for user: ${user.full_name} (${userId})`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_FAILED',
        message: 'Failed to change password'
      }
    });
  }
});

/**
 * @route PUT /api/v1/users/:id/roles
 * @desc Assign roles to user (admin only)
 * @access Private (Admin)
 */
router.put('/:id/roles', authenticate, authorize(80), preventPSTConflict, [
  param('id').isInt().withMessage('Invalid user ID'),
  body('role_ids').isArray().withMessage('Role IDs must be an array'),
  body('role_ids.*').isInt().withMessage('Each role ID must be an integer')
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
    const userId = parseInt(id);
    const { role_ids } = req.body;

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Verify all role IDs exist
    const roles = await models.Role.findAll({
      where: { id: role_ids, is_active: true }
    });

    if (roles.length !== role_ids.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLES',
          message: 'One or more role IDs are invalid'
        }
      });
    }

    // Start transaction
    const transaction = await models.sequelize.transaction();

    try {
      // Deactivate existing roles
      await models.UserRole.update(
        { is_active: false, deactivated_at: new Date() },
        { where: { user_id: userId, is_active: true }, transaction }
      );

      // Assign new roles
      for (const roleId of role_ids) {
        await models.UserRole.create({
          user_id: userId,
          role_id: roleId,
          assigned_by_user_id: req.user.id
        }, { transaction });
      }

      await transaction.commit();

      // Log the role assignment
      await models.AuditLog.create({
        user_id: req.user.id,
        action: 'ROLE_ASSIGNMENT',
        table_name: 'user_roles',
        record_id: userId,
        old_values: null,
        new_values: { role_ids },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      logger.info(`Roles assigned to user ${user.full_name} (${userId}): ${role_ids.join(', ')}`);

      res.json({
        success: true,
        message: 'Roles assigned successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Assign roles error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ROLE_ASSIGNMENT_FAILED',
        message: 'Failed to assign roles'
      }
    });
  }
});

/**
 * @route PUT /api/v1/users/:id/status
 * @desc Activate/deactivate user (admin only)
 * @access Private (Admin)
 */
router.put('/:id/status', authenticate, authorize(80), preventPSTConflict, [
  param('id').isInt().withMessage('Invalid user ID'),
  body('is_active').isBoolean().withMessage('is_active must be a boolean')
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
    const userId = parseInt(id);
    const { is_active } = req.body;

    // Prevent deactivating self
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DEACTIVATE_SELF',
          message: 'You cannot deactivate your own account'
        }
      });
    }

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    await user.update({ is_active });

    // Log the status change
    await models.AuditLog.create({
      user_id: req.user.id,
      action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      table_name: 'users',
      record_id: userId,
      old_values: { is_active: user.is_active },
      new_values: { is_active },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    logger.info(`User ${user.full_name} (${userId}) ${is_active ? 'activated' : 'deactivated'}`);

    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    logger.error('Change user status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHANGE_FAILED',
        message: 'Failed to change user status'
      }
    });
  }
});

module.exports = router;