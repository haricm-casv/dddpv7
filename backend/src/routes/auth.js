const express = require('express');
const { body, validationResult } = require('express-validator');
const models = require('../models');
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/auth');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const notificationTriggers = require('../services/notificationTriggers');

const router = express.Router();

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user with full validation and apartment/role assignment
 * @access Public
 */
router.post('/register', [
  // Personal Information
  body('full_name').trim().isLength({ min: 2, max: 200 }).withMessage('Full name must be between 2 and 200 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('mobile_number').isMobilePhone().withMessage('Please provide a valid mobile number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  // Profession
  body('profession_id').optional().isInt().withMessage('Invalid profession ID'),
  body('custom_profession').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Custom profession must be between 2 and 100 characters'),

  // Apartment Association
  body('apartment_id').isInt().withMessage('Apartment selection is required'),
  body('relationship_type').isIn(['owner', 'tenant']).withMessage('Relationship type must be either owner or tenant'),

  // Ownership specific fields
  body('ownership_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),

  // Tenant specific fields
  body('lease_start_date').optional().isISO8601().withMessage('Invalid lease start date'),
  body('lease_end_date').optional().isISO8601().withMessage('Invalid lease end date'),

  // Emergency Contact
  body('emergency_contact_name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Emergency contact name must be between 2 and 200 characters'),
  body('emergency_contact_number').optional().isMobilePhone().withMessage('Please provide a valid emergency contact number'),

  // Additional fields
  body('alternate_contact').optional().isMobilePhone().withMessage('Please provide a valid alternate contact number'),
  body('vehicle_info').optional().isLength({ max: 1000 }).withMessage('Vehicle info must not exceed 1000 characters')
], async (req, res) => {
  const transaction = await models.sequelize.transaction();

  try {
    // Check validation errors
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

    const {
      full_name, email, mobile_number, password, profession_id, custom_profession,
      apartment_id, relationship_type, ownership_percentage,
      lease_start_date, lease_end_date,
      emergency_contact_name, emergency_contact_number,
      alternate_contact, vehicle_info
    } = req.body;

    // Check if user already exists
    const existingUser = await models.User.findOne({
      where: {
        [models.Sequelize.Op.or]: [
          { email: email || null },
          { mobile_number }
        ]
      },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email or mobile number already exists'
        }
      });
    }

    // Verify apartment exists and is active
    const apartment = await models.Apartment.findOne({
      where: { id: apartment_id, is_active: true },
      transaction
    });

    if (!apartment) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_APARTMENT',
          message: 'Selected apartment is not available'
        }
      });
    }

    // Handle custom profession
    let finalProfessionId = profession_id;
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

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await models.User.create({
      full_name,
      email,
      mobile_number,
      password_hash: passwordHash,
      profession_id: finalProfessionId,
      alternate_contact,
      emergency_contact_name,
      emergency_contact_number,
      vehicle_info,
      must_reset_password: true
    }, { transaction });

    // Assign role based on relationship type
    const roleName = relationship_type === 'owner' ? 'Owner' : 'Tenant';
    const role = await models.Role.findOne({
      where: { role_name: roleName },
      transaction
    });

    if (role) {
      await models.UserRole.create({
        user_id: user.id,
        role_id: role.id,
        apartment_id: apartment_id,
        assigned_by_user_id: user.id // Self-assigned during registration
      }, { transaction });
    }

    // Create relationship based on type
    if (relationship_type === 'owner') {
      // Validate ownership percentage
      const defaultOwnershipPercentage = ownership_percentage || 100;

      await models.OwnershipRelationship.create({
        user_id: user.id,
        apartment_id: apartment_id,
        ownership_percentage: defaultOwnershipPercentage,
        start_date: new Date().toISOString().split('T')[0] // Today's date
      }, { transaction });
    } else if (relationship_type === 'tenant') {
      // Validate lease dates
      if (!lease_start_date || !lease_end_date) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_LEASE_DATES',
            message: 'Lease start and end dates are required for tenant registration'
          }
        });
      }

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

      await models.TenantRelationship.create({
        user_id: user.id,
        apartment_id: apartment_id,
        lease_start_date: lease_start_date,
        lease_end_date: lease_end_date
      }, { transaction });
    }

    // Send notification to PST committee about new registration
    await notificationTriggers.notifyNewRegistration(user.id, {
      full_name: user.full_name,
      apartment_name: apartment.getDisplayName(),
      primary_role: relationship_type
    });

    await transaction.commit();

    logger.info(`New user registered: ${user.full_name} (${user.mobile_number}) - ${relationship_type} of apartment ${apartment.getDisplayName()}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email/mobile for verification.',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          mobile_number: user.mobile_number,
          email_verified: user.email_verified,
          mobile_verified: user.mobile_verified,
          relationship_type,
          apartment: {
            id: apartment.id,
            display_name: apartment.getDisplayName()
          }
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user'
      }
    });
  }
});

/**
 * @route POST /api/v1/auth/login
 * @desc Authenticate user and return tokens
 * @access Public
 */
router.post('/login', [
  body('identifier').notEmpty().withMessage('Email or mobile number is required'),
  body('password').notEmpty().withMessage('Password is required')
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

    const { identifier, password } = req.body;

    // Find user by email or mobile
    const user = await models.User.findOne({
      where: {
        [models.Sequelize.Op.or]: [
          { email: identifier },
          { mobile_number: identifier }
        ],
        is_active: true
      },
      include: [{
        model: models.Role,
        through: { attributes: [] },
        where: { is_active: true },
        required: false
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      });
    }

    // Update last login
    await user.update({ last_login_at: new Date() });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      full_name: user.full_name,
      email: user.email,
      mobile_number: user.mobile_number
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.info(`User logged in: ${user.full_name} (${user.mobile_number})`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          mobile_number: user.mobile_number,
          email_verified: user.email_verified,
          mobile_verified: user.mobile_verified,
          must_reset_password: user.must_reset_password,
          roles: user.Roles || []
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 15 * 60 // 15 minutes
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Login failed'
      }
    });
  }
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', [
  body('refresh_token').notEmpty().withMessage('Refresh token is required')
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
/**
 * @route POST /api/v1/auth/send-verification
 * @desc Send email verification code
 * @access Private
 */
router.post('/send-verification', authenticate, async (req, res) => {
  try {
    const user = await models.User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_EMAIL',
          message: 'No email address associated with this account'
        }
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Email is already verified'
        }
      });
    }

    // Generate verification code (6-digit)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code (you might want to use Redis or a separate table for this)
    // For now, we'll store it in a temporary field or use a verification token
    const verificationToken = generateAccessToken({
      userId: user.id,
      type: 'email_verification',
      code: verificationCode
    });

    // TODO: Send email with verification code
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Email Verification - DD Diamond Park',
    //   html: `Your verification code is: <strong>${verificationCode}</strong>`
    // });

    logger.info(`Verification code sent to ${user.email} for user ${user.full_name}`);

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        verification_token: verificationToken // Client should store this temporarily
      }
    });
  } catch (error) {
    logger.error('Send verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_SEND_FAILED',
        message: 'Failed to send verification code'
      }
    });
  }
});

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email with code
 * @access Private
 */
router.post('/verify-email', authenticate, [
  body('verification_token').notEmpty().withMessage('Verification token is required'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Verification code must be 6 digits')
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

    const { verification_token, code } = req.body;

    // Verify token and extract code
    const decoded = verifyRefreshToken(verification_token); // Using refresh token verification for longer expiry

    if (decoded.type !== 'email_verification' || decoded.code !== code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VERIFICATION_CODE',
          message: 'Invalid verification code'
        }
      });
    }

    const user = await models.User.findByPk(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Email is already verified'
        }
      });
    }

    // Mark email as verified
    await user.update({ email_verified: true });

    logger.info(`Email verified for user: ${user.full_name} (${user.email})`);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: 'Failed to verify email'
      }
    });
  }
});

   } catch (error) {
     logger.error('Token refresh error:', error);
     res.status(401).json({
       success: false,
       error: {
         code: 'INVALID_REFRESH_TOKEN',
         message: 'Invalid refresh token'
       }
     });
   }
 });

module.exports = router;

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user (client-side token removal)
 * @access Private
 */
router.post('/logout', authenticate, (req, res) => {
  logger.info(`User logged out: ${req.user.full_name}`);
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await models.User.findByPk(req.user.id, {
      include: [{
        model: models.Role,
        through: { attributes: [] },
        where: { is_active: true },
        required: false
      }]
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
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          mobile_number: user.mobile_number,
          profession_id: user.profession_id,
          profile_photo_url: user.profile_photo_url,
          email_verified: user.email_verified,
          mobile_verified: user.mobile_verified,
          must_reset_password: user.must_reset_password,
          last_login_at: user.last_login_at,
          roles: user.Roles || []
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to fetch user profile'
      }
    });
  }
});

module.exports = router;