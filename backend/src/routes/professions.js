const express = require('express');
const { body, param, validationResult } = require('express-validator');
const models = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/professions
 * @desc Get all professions (predefined and custom)
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { include_custom = 'true', is_active = 'true' } = req.query;

    const whereClause = {};
    if (is_active !== 'all') {
      whereClause.is_active = is_active === 'true';
    }

    const professions = await models.Profession.findAll({
      where: whereClause,
      order: [
        ['is_custom', 'ASC'], // Predefined first
        ['name', 'ASC']
      ]
    });

    // Separate predefined and custom professions
    const predefined = professions.filter(p => !p.is_custom);
    const custom = professions.filter(p => p.is_custom);

    res.json({
      success: true,
      data: {
        professions: {
          predefined,
          custom: include_custom === 'true' ? custom : []
        }
      }
    });
  } catch (error) {
    logger.error('Get professions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFESSIONS_FETCH_FAILED',
        message: 'Failed to fetch professions'
      }
    });
  }
});

/**
 * @route GET /api/v1/professions/:id
 * @desc Get profession by ID
 * @access Public
 */
router.get('/:id', [
  param('id').isInt().withMessage('Invalid profession ID')
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

    const profession = await models.Profession.findByPk(id);

    if (!profession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROFESSION_NOT_FOUND',
          message: 'Profession not found'
        }
      });
    }

    res.json({
      success: true,
      data: { profession }
    });
  } catch (error) {
    logger.error('Get profession error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFESSION_FETCH_FAILED',
        message: 'Failed to fetch profession'
      }
    });
  }
});

/**
 * @route POST /api/v1/professions
 * @desc Create a new custom profession
 * @access Private (Authenticated users)
 */
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Profession name must be between 2 and 100 characters')
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

    const { name } = req.body;

    // Check if profession already exists (both predefined and custom)
    const existingProfession = await models.Profession.findOne({
      where: {
        name: {
          [models.Sequelize.Op.iLike]: name // Case-insensitive search
        }
      }
    });

    if (existingProfession) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PROFESSION_EXISTS',
          message: 'A profession with this name already exists',
          data: {
            profession: existingProfession
          }
        }
      });
    }

    // Create custom profession
    const profession = await models.Profession.create({
      name,
      is_custom: true,
      is_active: true
    });

    logger.info(`Custom profession created: ${profession.name} by user ${req.user.full_name}`);

    res.status(201).json({
      success: true,
      message: 'Custom profession created successfully',
      data: { profession }
    });
  } catch (error) {
    logger.error('Create profession error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFESSION_CREATE_FAILED',
        message: 'Failed to create profession'
      }
    });
  }
});

/**
 * @route PUT /api/v1/professions/:id
 * @desc Update profession (admin only for predefined, owner for custom)
 * @access Private
 */
router.put('/:id', authenticate, [
  param('id').isInt().withMessage('Invalid profession ID'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Profession name must be between 2 and 100 characters'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
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
    const { name, is_active } = req.body;

    const profession = await models.Profession.findByPk(id);

    if (!profession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROFESSION_NOT_FOUND',
          message: 'Profession not found'
        }
      });
    }

    // Check permissions
    const isAdmin = req.user.permissions?.maxPermissionLevel >= 80;
    const isOwner = profession.is_custom && profession.created_by_user_id === req.user.id;

    if (!profession.is_custom && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can modify predefined professions'
        }
      });
    }

    if (profession.is_custom && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only modify your own custom professions'
        }
      });
    }

    // Check for name conflicts if name is being updated
    if (name && name !== profession.name) {
      const existingProfession = await models.Profession.findOne({
        where: {
          name: {
            [models.Sequelize.Op.iLike]: name
          },
          id: {
            [models.Sequelize.Op.ne]: id
          }
        }
      });

      if (existingProfession) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PROFESSION_EXISTS',
            message: 'A profession with this name already exists'
          }
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (is_active !== undefined) updateData.is_active = is_active;

    await profession.update(updateData);

    logger.info(`Profession updated: ${profession.name} by user ${req.user.full_name}`);

    res.json({
      success: true,
      message: 'Profession updated successfully',
      data: { profession }
    });
  } catch (error) {
    logger.error('Update profession error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFESSION_UPDATE_FAILED',
        message: 'Failed to update profession'
      }
    });
  }
});

/**
 * @route DELETE /api/v1/professions/:id
 * @desc Delete custom profession (owner or admin only)
 * @access Private
 */
router.delete('/:id', authenticate, [
  param('id').isInt().withMessage('Invalid profession ID')
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

    const profession = await models.Profession.findByPk(id);

    if (!profession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROFESSION_NOT_FOUND',
          message: 'Profession not found'
        }
      });
    }

    // Cannot delete predefined professions
    if (!profession.is_custom) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_PREDEFINED',
          message: 'Predefined professions cannot be deleted'
        }
      });
    }

    // Check permissions
    const isAdmin = req.user.permissions?.maxPermissionLevel >= 80;
    const isOwner = profession.created_by_user_id === req.user.id;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only delete your own custom professions'
        }
      });
    }

    // Check if profession is being used
    const usersUsingProfession = await models.User.count({
      where: { profession_id: id }
    });

    if (usersUsingProfession > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PROFESSION_IN_USE',
          message: 'Cannot delete profession that is currently assigned to users'
        }
      });
    }

    await profession.destroy();

    logger.info(`Custom profession deleted: ${profession.name} by user ${req.user.full_name}`);

    res.json({
      success: true,
      message: 'Profession deleted successfully'
    });
  } catch (error) {
    logger.error('Delete profession error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFESSION_DELETE_FAILED',
        message: 'Failed to delete profession'
      }
    });
  }
});

module.exports = router;