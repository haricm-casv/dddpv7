const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const models = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/apartments
 * @desc Get all apartments with proper floor/type ordering
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      floor_number,
      unit_type,
      is_active = 'true',
      include_occupancy = 'false'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (floor_number) {
      whereClause.floor_number = floor_number;
    }

    if (unit_type) {
      whereClause.unit_type = unit_type;
    }

    if (is_active !== 'all') {
      whereClause.is_active = is_active === 'true';
    }

    const includeClause = [];

    if (include_occupancy === 'true') {
      // Include ownership and tenant information
      includeClause.push({
        model: models.OwnershipRelationship,
        where: { is_active: true },
        required: false,
        include: [{
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'mobile_number']
        }]
      });

      includeClause.push({
        model: models.TenantRelationship,
        where: { is_active: true },
        required: false,
        include: [{
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'mobile_number']
        }]
      });
    }

    const { count, rows: apartments } = await models.Apartment.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['floor_number', 'ASC'],
        ['unit_type', 'ASC'],
        ['unit_number', 'ASC']
      ],
      attributes: {
        include: [
          // Add display_name as a virtual field
          [
            models.sequelize.literal("CONCAT(floor_number, ' ', unit_type)"),
            'display_name'
          ]
        ]
      }
    });

    res.json({
      success: true,
      data: {
        apartments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get apartments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APARTMENTS_FETCH_FAILED',
        message: 'Failed to fetch apartments'
      }
    });
  }
});

/**
 * @route GET /api/v1/apartments/available
 * @desc Get available apartments for registration
 * @access Public
 */
router.get('/available', async (req, res) => {
  try {
    const { relationship_type = 'all' } = req.query;

    // Get all active apartments
    const apartments = await models.Apartment.findAll({
      where: { is_active: true },
      order: [
        ['floor_number', 'ASC'],
        ['unit_type', 'ASC'],
        ['unit_number', 'ASC']
      ],
      attributes: {
        include: [
          [
            models.sequelize.literal("CONCAT(floor_number, ' ', unit_type)"),
            'display_name'
          ]
        ]
      }
    });

    // Get occupancy information
    const apartmentIds = apartments.map(apt => apt.id);

    const ownerships = await models.OwnershipRelationship.findAll({
      where: {
        apartment_id: apartmentIds,
        is_active: true
      },
      include: [{
        model: models.User,
        attributes: ['id', 'full_name']
      }]
    });

    const tenancies = await models.TenantRelationship.findAll({
      where: {
        apartment_id: apartmentIds,
        is_active: true
      },
      include: [{
        model: models.User,
        attributes: ['id', 'full_name']
      }]
    });

    // Create occupancy map
    const occupancyMap = {};

    ownerships.forEach(ownership => {
      if (!occupancyMap[ownership.apartment_id]) {
        occupancyMap[ownership.apartment_id] = { owners: [], tenants: [] };
      }
      occupancyMap[ownership.apartment_id].owners.push({
        id: ownership.User.id,
        name: ownership.User.full_name,
        percentage: ownership.ownership_percentage
      });
    });

    tenancies.forEach(tenancy => {
      if (!occupancyMap[tenancy.apartment_id]) {
        occupancyMap[tenancy.apartment_id] = { owners: [], tenants: [] };
      }
      occupancyMap[tenancy.apartment_id].tenants.push({
        id: tenancy.User.id,
        name: tenancy.User.full_name,
        lease_end: tenancy.lease_end_date
      });
    });

    // Filter available apartments based on relationship type
    let availableApartments = apartments;

    if (relationship_type === 'owner') {
      // For ownership: apartment should not be fully owned (total ownership < 100%)
      availableApartments = apartments.filter(apt => {
        const occupancy = occupancyMap[apt.id] || { owners: [] };
        const totalOwnership = occupancy.owners.reduce((sum, owner) => sum + owner.percentage, 0);
        return totalOwnership < 100;
      });
    } else if (relationship_type === 'tenant') {
      // For tenancy: apartment should not have an active tenant
      availableApartments = apartments.filter(apt => {
        const occupancy = occupancyMap[apt.id] || { tenants: [] };
        return occupancy.tenants.length === 0;
      });
    }

    // Add occupancy info to response
    const responseApartments = availableApartments.map(apt => ({
      ...apt.toJSON(),
      occupancy: occupancyMap[apt.id] || { owners: [], tenants: [] }
    }));

    res.json({
      success: true,
      data: {
        apartments: responseApartments,
        total: responseApartments.length
      }
    });
  } catch (error) {
    logger.error('Get available apartments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AVAILABLE_APARTMENTS_FETCH_FAILED',
        message: 'Failed to fetch available apartments'
      }
    });
  }
});

/**
 * @route GET /api/v1/apartments/:id
 * @desc Get apartment by ID with full details
 * @access Private
 */
router.get('/:id', authenticate, [
  param('id').isInt().withMessage('Invalid apartment ID')
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

    const apartment = await models.Apartment.findByPk(id, {
      include: [
        {
          model: models.OwnershipRelationship,
          where: { is_active: true },
          required: false,
          include: [{
            model: models.User,
            attributes: ['id', 'full_name', 'email', 'mobile_number', 'profession_id']
          }]
        },
        {
          model: models.TenantRelationship,
          where: { is_active: true },
          required: false,
          include: [{
            model: models.User,
            attributes: ['id', 'full_name', 'email', 'mobile_number', 'profession_id']
          }]
        },
        {
          model: models.ParkingSlot,
          where: { is_active: true },
          required: false
        }
      ],
      attributes: {
        include: [
          [
            models.sequelize.literal("CONCAT(floor_number, ' ', unit_type)"),
            'display_name'
          ]
        ]
      }
    });

    if (!apartment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APARTMENT_NOT_FOUND',
          message: 'Apartment not found'
        }
      });
    }

    res.json({
      success: true,
      data: { apartment }
    });
  } catch (error) {
    logger.error('Get apartment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APARTMENT_FETCH_FAILED',
        message: 'Failed to fetch apartment'
      }
    });
  }
});

/**
 * @route POST /api/v1/apartments
 * @desc Create new apartment (admin only)
 * @access Private (Admin)
 */
router.post('/', authenticate, authorize(80), [
  body('floor_number').isInt({ min: 1 }).withMessage('Floor number must be a positive integer'),
  body('unit_type').isLength({ min: 1, max: 10 }).withMessage('Unit type is required and must be max 10 characters'),
  body('unit_number').isLength({ min: 1, max: 10 }).withMessage('Unit number is required and must be max 10 characters'),
  body('square_footage').optional().isFloat({ min: 0 }).withMessage('Square footage must be a positive number'),
  body('building_name').optional().isLength({ max: 100 }).withMessage('Building name must be max 100 characters')
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

    const { floor_number, unit_type, unit_number, square_footage, building_name } = req.body;

    // Check if apartment already exists
    const existingApartment = await models.Apartment.findOne({
      where: {
        floor_number,
        unit_type,
        unit_number
      }
    });

    if (existingApartment) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'APARTMENT_EXISTS',
          message: 'An apartment with this floor, type, and number already exists'
        }
      });
    }

    const apartment = await models.Apartment.create({
      floor_number,
      unit_type,
      unit_number,
      square_footage,
      building_name,
      is_active: true
    });

    logger.info(`New apartment created: ${apartment.getDisplayName()} by user ${req.user.full_name}`);

    res.status(201).json({
      success: true,
      message: 'Apartment created successfully',
      data: {
        apartment: {
          ...apartment.toJSON(),
          display_name: apartment.getDisplayName()
        }
      }
    });
  } catch (error) {
    logger.error('Create apartment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APARTMENT_CREATE_FAILED',
        message: 'Failed to create apartment'
      }
    });
  }
});

/**
 * @route PUT /api/v1/apartments/:id
 * @desc Update apartment (admin only)
 * @access Private (Admin)
 */
router.put('/:id', authenticate, authorize(80), [
  param('id').isInt().withMessage('Invalid apartment ID'),
  body('floor_number').optional().isInt({ min: 1 }).withMessage('Floor number must be a positive integer'),
  body('unit_type').optional().isLength({ min: 1, max: 10 }).withMessage('Unit type must be max 10 characters'),
  body('unit_number').optional().isLength({ min: 1, max: 10 }).withMessage('Unit number must be max 10 characters'),
  body('square_footage').optional().isFloat({ min: 0 }).withMessage('Square footage must be a positive number'),
  body('building_name').optional().isLength({ max: 100 }).withMessage('Building name must be max 100 characters'),
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
    const updateData = req.body;

    const apartment = await models.Apartment.findByPk(id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APARTMENT_NOT_FOUND',
          message: 'Apartment not found'
        }
      });
    }

    // Check for conflicts if floor/type/number are being updated
    if (updateData.floor_number || updateData.unit_type || updateData.unit_number) {
      const conflictCheck = await models.Apartment.findOne({
        where: {
          floor_number: updateData.floor_number || apartment.floor_number,
          unit_type: updateData.unit_type || apartment.unit_type,
          unit_number: updateData.unit_number || apartment.unit_number,
          id: { [models.Sequelize.Op.ne]: id }
        }
      });

      if (conflictCheck) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'APARTMENT_EXISTS',
            message: 'An apartment with this floor, type, and number already exists'
          }
        });
      }
    }

    await apartment.update(updateData);

    logger.info(`Apartment updated: ${apartment.getDisplayName()} by user ${req.user.full_name}`);

    res.json({
      success: true,
      message: 'Apartment updated successfully',
      data: {
        apartment: {
          ...apartment.toJSON(),
          display_name: apartment.getDisplayName()
        }
      }
    });
  } catch (error) {
    logger.error('Update apartment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APARTMENT_UPDATE_FAILED',
        message: 'Failed to update apartment'
      }
    });
  }
});

module.exports = router;