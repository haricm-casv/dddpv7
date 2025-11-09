const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const models = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/parking-slots
 * @desc Get all parking slots with optional filters
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status, // 'available', 'assigned', 'all'
      apartment_id,
      assigned_to_user_id,
      slot_number
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { is_active: true };

    // Apply filters
    if (status === 'available') {
      whereClause.assigned_to_user_id = null;
    } else if (status === 'assigned') {
      whereClause.assigned_to_user_id = { [models.Sequelize.Op.ne]: null };
    }

    if (apartment_id) {
      whereClause.apartment_id = apartment_id;
    }

    if (assigned_to_user_id) {
      whereClause.assigned_to_user_id = assigned_to_user_id;
    }

    if (slot_number) {
      whereClause.slot_number = slot_number;
    }

    const { count, rows: slots } = await models.ParkingSlot.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'assignedToUser',
          attributes: ['id', 'full_name', 'email', 'mobile_number'],
          required: false
        },
        {
          model: models.User,
          as: 'assignedByUser',
          attributes: ['id', 'full_name'],
          required: false
        },
        {
          model: models.Apartment,
          attributes: ['id', 'floor_number', 'unit_type', 'unit_number', 'building_name'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['slot_number', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        slots,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Parking slots fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SLOTS_FETCH_FAILED',
        message: 'Failed to fetch parking slots'
      }
    });
  }
});

/**
 * @route GET /api/v1/parking-slots/:id
 * @desc Get specific parking slot details
 * @access Private
 */
router.get('/:id', authenticate, [
  param('id').isInt({ min: 1 }).withMessage('Invalid slot ID')
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

    const slot = await models.ParkingSlot.findByPk(req.params.id, {
      include: [
        {
          model: models.User,
          as: 'assignedToUser',
          attributes: ['id', 'full_name', 'email', 'mobile_number'],
          required: false
        },
        {
          model: models.User,
          as: 'assignedByUser',
          attributes: ['id', 'full_name'],
          required: false
        },
        {
          model: models.Apartment,
          attributes: ['id', 'floor_number', 'unit_type', 'unit_number', 'building_name'],
          required: false
        }
      ]
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SLOT_NOT_FOUND',
          message: 'Parking slot not found'
        }
      });
    }

    res.json({
      success: true,
      data: { slot }
    });
  } catch (error) {
    logger.error('Parking slot fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SLOT_FETCH_FAILED',
        message: 'Failed to fetch parking slot'
      }
    });
  }
});

/**
 * @route POST /api/v1/parking-slots/:id/assign
 * @desc Assign parking slot to a user
 * @access Private (Admin/PST only)
 */
router.post('/:id/assign', authenticate, authorize(80), [
  param('id').isInt({ min: 1 }).withMessage('Invalid slot ID'),
  body('user_id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('apartment_id').optional().isInt({ min: 1 }).withMessage('Valid apartment ID is required'),
  body('vehicle_info').optional().isString().trim().isLength({ max: 255 }).withMessage('Vehicle info must be less than 255 characters'),
  body('reason').optional().isString().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { user_id, apartment_id, vehicle_info, reason } = req.body;
    const slotId = req.params.id;

    // Check if slot exists and is active
    const slot = await models.ParkingSlot.findByPk(slotId, { transaction });
    if (!slot || !slot.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'SLOT_NOT_FOUND',
          message: 'Parking slot not found or inactive'
        }
      });
    }

    // Check if slot is already assigned
    if (slot.assigned_to_user_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'SLOT_ALREADY_ASSIGNED',
          message: 'Parking slot is already assigned'
        }
      });
    }

    // Check if user exists
    const user = await models.User.findByPk(user_id, { transaction });
    if (!user || !user.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        }
      });
    }

    // If apartment_id provided, check if it exists
    if (apartment_id) {
      const apartment = await models.Apartment.findByPk(apartment_id, { transaction });
      if (!apartment || !apartment.is_active) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            code: 'APARTMENT_NOT_FOUND',
            message: 'Apartment not found or inactive'
          }
        });
      }
    }

    // Get old values for audit log
    const oldValues = {
      assigned_to_user_id: slot.assigned_to_user_id,
      apartment_id: slot.apartment_id,
      vehicle_info: slot.vehicle_info,
      assignment_date: slot.assignment_date,
      assigned_by_user_id: slot.assigned_by_user_id
    };

    // Update slot
    const updateData = {
      assigned_to_user_id: user_id,
      assignment_date: new Date(),
      assigned_by_user_id: req.user.id
    };

    if (apartment_id !== undefined) {
      updateData.apartment_id = apartment_id;
    }

    if (vehicle_info !== undefined) {
      updateData.vehicle_info = vehicle_info;
    }

    await slot.update(updateData, { transaction });

    // Create audit log
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'parking_slots',
      record_id: slotId,
      old_value: oldValues,
      new_value: updateData,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: req.user.role_name,
      reason: reason || 'Parking slot assignment'
    }, { transaction });

    await transaction.commit();

    // Fetch updated slot with associations
    const updatedSlot = await models.ParkingSlot.findByPk(slotId, {
      include: [
        {
          model: models.User,
          as: 'assignedToUser',
          attributes: ['id', 'full_name', 'email', 'mobile_number'],
          required: false
        },
        {
          model: models.User,
          as: 'assignedByUser',
          attributes: ['id', 'full_name'],
          required: false
        },
        {
          model: models.Apartment,
          attributes: ['id', 'floor_number', 'unit_type', 'unit_number', 'building_name'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: { slot: updatedSlot },
      message: 'Parking slot assigned successfully'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Parking slot assignment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSIGNMENT_FAILED',
        message: 'Failed to assign parking slot'
      }
    });
  }
});

/**
 * @route POST /api/v1/parking-slots/:id/unassign
 * @desc Unassign parking slot from user
 * @access Private (Admin/PST only)
 */
router.post('/:id/unassign', authenticate, authorize(80), [
  param('id').isInt({ min: 1 }).withMessage('Invalid slot ID'),
  body('reason').optional().isString().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { reason } = req.body;
    const slotId = req.params.id;

    // Check if slot exists and is active
    const slot = await models.ParkingSlot.findByPk(slotId, { transaction });
    if (!slot || !slot.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'SLOT_NOT_FOUND',
          message: 'Parking slot not found or inactive'
        }
      });
    }

    // Check if slot is assigned
    if (!slot.assigned_to_user_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'SLOT_NOT_ASSIGNED',
          message: 'Parking slot is not currently assigned'
        }
      });
    }

    // Get old values for audit log
    const oldValues = {
      assigned_to_user_id: slot.assigned_to_user_id,
      apartment_id: slot.apartment_id,
      vehicle_info: slot.vehicle_info,
      assignment_date: slot.assignment_date,
      assigned_by_user_id: slot.assigned_by_user_id
    };

    // Update slot
    const updateData = {
      assigned_to_user_id: null,
      apartment_id: null,
      vehicle_info: null,
      assignment_date: null,
      assigned_by_user_id: null
    };

    await slot.update(updateData, { transaction });

    // Create audit log
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'parking_slots',
      record_id: slotId,
      old_value: oldValues,
      new_value: updateData,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: req.user.role_name,
      reason: reason || 'Parking slot unassignment'
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Parking slot unassigned successfully'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Parking slot unassignment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UNASSIGNMENT_FAILED',
        message: 'Failed to unassign parking slot'
      }
    });
  }
});

/**
 * @route PUT /api/v1/parking-slots/:id/vehicle
 * @desc Update vehicle information for assigned slot
 * @access Private (Admin/PST or assigned user)
 */
router.put('/:id/vehicle', authenticate, [
  param('id').isInt({ min: 1 }).withMessage('Invalid slot ID'),
  body('vehicle_info').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Vehicle info is required and must be less than 255 characters'),
  body('reason').optional().isString().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { vehicle_info, reason } = req.body;
    const slotId = req.params.id;

    // Check if slot exists and is active
    const slot = await models.ParkingSlot.findByPk(slotId, { transaction });
    if (!slot || !slot.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'SLOT_NOT_FOUND',
          message: 'Parking slot not found or inactive'
        }
      });
    }

    // Check permissions: Admin/PST or assigned user
    const isAdminOrPST = req.user.permission_level >= 80;
    const isAssignedUser = slot.assigned_to_user_id === req.user.id;

    if (!isAdminOrPST && !isAssignedUser) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only update vehicle info for your assigned parking slots'
        }
      });
    }

    // Get old values for audit log
    const oldValues = {
      vehicle_info: slot.vehicle_info
    };

    // Update vehicle info
    await slot.update({ vehicle_info }, { transaction });

    // Create audit log
    await models.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      table_name: 'parking_slots',
      record_id: slotId,
      old_value: oldValues,
      new_value: { vehicle_info },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      user_role: req.user.role_name,
      reason: reason || 'Vehicle information update'
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Vehicle information updated successfully'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Vehicle info update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VEHICLE_UPDATE_FAILED',
        message: 'Failed to update vehicle information'
      }
    });
  }
});

/**
 * @route PUT /api/v1/parking-slots/:id
 * @desc Update parking slot details (Admin only)
 * @access Private (Admin only)
 */
router.put('/:id', authenticate, authorize(90), [
  param('id').isInt({ min: 1 }).withMessage('Invalid slot ID'),
  body('apartment_id').optional().isInt({ min: 1 }).withMessage('Valid apartment ID required'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('reason').optional().isString().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { apartment_id, is_active, reason } = req.body;
    const slotId = req.params.id;

    // Check if slot exists
    const slot = await models.ParkingSlot.findByPk(slotId, { transaction });
    if (!slot) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: {
          code: 'SLOT_NOT_FOUND',
          message: 'Parking slot not found'
        }
      });
    }

    // If deactivating and slot is assigned, prevent it
    if (is_active === false && slot.assigned_to_user_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DEACTIVATE_ASSIGNED_SLOT',
          message: 'Cannot deactivate an assigned parking slot. Unassign first.'
        }
      });
    }

    // Get old values for audit log
    const oldValues = {
      apartment_id: slot.apartment_id,
      is_active: slot.is_active
    };

    // Update slot
    const updateData = {};
    if (apartment_id !== undefined) updateData.apartment_id = apartment_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length > 0) {
      await slot.update(updateData, { transaction });

      // Create audit log
      await models.AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        table_name: 'parking_slots',
        record_id: slotId,
        old_value: oldValues,
        new_value: updateData,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        user_role: req.user.role_name,
        reason: reason || 'Parking slot update'
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Parking slot updated successfully'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Parking slot update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SLOT_UPDATE_FAILED',
        message: 'Failed to update parking slot'
      }
    });
  }
});

/**
 * @route GET /api/v1/parking-slots/stats/summary
 * @desc Get parking slot statistics
 * @access Private
 */
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const totalSlots = await models.ParkingSlot.count({ where: { is_active: true } });
    const assignedSlots = await models.ParkingSlot.count({
      where: { is_active: true, assigned_to_user_id: { [models.Sequelize.Op.ne]: null } }
    });
    const availableSlots = totalSlots - assignedSlots;

    // Get assignment stats by apartment
    const apartmentStats = await models.ParkingSlot.findAll({
      where: { is_active: true },
      attributes: [
        'apartment_id',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('id')), 'total_slots'],
        [models.Sequelize.fn('COUNT',
          models.Sequelize.fn('CASE',
            'WHEN assigned_to_user_id IS NOT NULL THEN 1 END'
          )
        ), 'assigned_slots']
      ],
      include: [{
        model: models.Apartment,
        attributes: ['floor_number', 'unit_type', 'unit_number'],
        required: false
      }],
      group: ['apartment_id', 'Apartment.id'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        total_slots: totalSlots,
        assigned_slots: assignedSlots,
        available_slots: availableSlots,
        occupancy_rate: totalSlots > 0 ? (assignedSlots / totalSlots * 100).toFixed(2) : 0,
        apartment_stats: apartmentStats
      }
    });
  } catch (error) {
    logger.error('Parking stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch parking statistics'
      }
    });
  }
});

module.exports = router;