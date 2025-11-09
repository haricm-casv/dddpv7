const { verifyAccessToken, getUserPermissions, hasPermissionLevel, isPSTCommitteeMember, getPSTRole } = require('../utils/auth');
const models = require('../models');

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required',
        },
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user with roles
    const user = await models.User.findByPk(decoded.userId, {
      include: [{
        model: models.Role,
        through: { attributes: [] },
        where: { is_active: true },
        required: false
      }]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive',
        },
      });
    }

    // Attach user and permissions to request
    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      mobile_number: user.mobile_number,
      roles: user.Roles || [],
      permissions: getUserPermissions(user.Roles || []),
      isPSTMember: isPSTCommitteeMember(user.Roles || []),
      pstRole: getPSTRole(user.Roles || [])
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error.message || 'Invalid access token',
      },
    });
  }
};

/**
 * Middleware to authorize based on permission level
 * @param {number} requiredLevel - Required permission level
 * @returns {Function} Middleware function
 */
const authorize = (requiredLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    if (!hasPermissionLevel(req.user.roles, requiredLevel)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required permission level: ${requiredLevel}`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can approve/reject requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const canApprove = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required',
      },
    });
  }

  if (!req.user.permissions.canApprove) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CANNOT_APPROVE',
        message: 'User does not have approval permissions',
      },
    });
  }

  next();
};

/**
 * Middleware to check if user can override decisions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const canOverride = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required',
      },
    });
  }

  if (!req.user.permissions.canOverride) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CANNOT_OVERRIDE',
        message: 'User does not have override permissions',
      },
    });
  }

  next();
};

/**
 * Middleware to prevent PST committee members from approving their own requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const preventPSTConflict = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isPSTMember) {
      return next(); // Not a PST member, no conflict possible
    }

    // Get the target record ID from request params or body
    const targetRecordId = req.params.id || req.body.target_record_id || req.body.recordId;

    if (!targetRecordId) {
      return next(); // No specific record targeted
    }

    // Check if the user is trying to act on their own record
    // This is a generic check - specific logic would depend on the table being acted upon
    const tableName = req.body.target_table || req.baseUrl.split('/').pop();

    let isOwnRecord = false;
    let conflictReason = '';

    switch (tableName) {
      case 'users':
        isOwnRecord = parseInt(targetRecordId) === req.user.id;
        conflictReason = 'PST members cannot approve their own user registrations';
        break;
      case 'apartments':
        // Check if user owns this apartment
        const ownership = await models.OwnershipRelationship.findOne({
          where: {
            user_id: req.user.id,
            apartment_id: targetRecordId,
            is_active: true
          }
        });
        isOwnRecord = !!ownership;
        conflictReason = 'PST members cannot approve requests for apartments they own';
        break;
      case 'ownership_transfers':
        // Check if user is the transferor or transferee
        const transfer = await models.OwnershipTransfer.findByPk(targetRecordId);
        if (transfer) {
          isOwnRecord = transfer.from_user_id === req.user.id || transfer.to_user_id === req.user.id;
          conflictReason = 'PST members cannot approve their own ownership transfer requests';
        }
        break;
      case 'tenant_relationships':
        // Check if user is the tenant
        const tenantRelation = await models.TenantRelationship.findByPk(targetRecordId);
        if (tenantRelation) {
          isOwnRecord = tenantRelation.user_id === req.user.id;
          conflictReason = 'PST members cannot approve their own tenancy requests';
        }
        break;
      case 'ownership_relationships':
        // Check if user is requesting ownership
        const ownershipRelation = await models.OwnershipRelationship.findByPk(targetRecordId);
        if (ownershipRelation) {
          isOwnRecord = ownershipRelation.user_id === req.user.id;
          conflictReason = 'PST members cannot approve their own ownership requests';
        }
        break;
      default:
        // For other tables, assume no conflict unless specified
        isOwnRecord = false;
    }

    if (isOwnRecord) {
      // Log the conflict attempt
      await models.AuditLog.create({
        user_id: req.user.id,
        action: 'CONFLICT_ATTEMPT',
        table_name: tableName,
        record_id: targetRecordId,
        user_role: req.user.pstRole,
        reason: `PST conflict prevented: ${conflictReason}`,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'PST_CONFLICT',
          message: conflictReason,
        },
      });
    }

    next();
  } catch (error) {
    console.error('PST conflict check error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONFLICT_CHECK_ERROR',
        message: 'Error checking for conflicts of interest',
      },
    });
  }
};

/**
 * Middleware to check instant approval eligibility
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkInstantApproval = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required',
      },
    });
  }

  // Attach instant approval flag to request
  req.instantApproval = req.user.permissions.instantApproval;

  next();
};

module.exports = {
  authenticate,
  authorize,
  canApprove,
  canOverride,
  preventPSTConflict,
  checkInstantApproval
};