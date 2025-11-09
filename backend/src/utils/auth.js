const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a JWT access token
 * @param {Object} payload - User data to include in token
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate a JWT refresh token
 * @param {Object} payload - User data to include in token
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

/**
 * Verify a JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify a JWT refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Generate a secure random token for password reset or email verification
 * @returns {string} Random token
 */
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get user permissions based on roles
 * @param {Array} userRoles - Array of user role objects
 * @returns {Object} Permissions object
 */
const getUserPermissions = (userRoles) => {
  const permissions = {
    canApprove: false,
    canReject: false,
    canModify: false,
    canOverride: false,
    instantApproval: false,
    maxPermissionLevel: 0
  };

  userRoles.forEach(role => {
    if (role.Role && role.Role.permission_level > permissions.maxPermissionLevel) {
      permissions.maxPermissionLevel = role.Role.permission_level;
    }

    // Level 80+ gets instant approval
    if (role.Role && role.Role.permission_level >= 80) {
      permissions.instantApproval = true;
    }

    // Define permissions based on role names or levels
    const roleName = role.Role ? role.Role.role_name.toLowerCase() : '';
    if (roleName.includes('admin') || roleName.includes('president') || roleName.includes('secretary') || roleName.includes('treasurer')) {
      permissions.canApprove = true;
      permissions.canReject = true;
      permissions.canModify = true;
      if (roleName.includes('president') || permissions.maxPermissionLevel >= 90) {
        permissions.canOverride = true;
      }
    }
  });

  return permissions;
};

/**
 * Check if user has required permission level
 * @param {Array} userRoles - Array of user role objects
 * @param {number} requiredLevel - Required permission level
 * @returns {boolean} True if user has required level
 */
const hasPermissionLevel = (userRoles, requiredLevel) => {
  return userRoles.some(role => role.Role && role.Role.permission_level >= requiredLevel);
};

/**
 * Check if user is PST committee member
 * @param {Array} userRoles - Array of user role objects
 * @returns {boolean} True if user is PST committee member
 */
const isPSTCommitteeMember = (userRoles) => {
  return userRoles.some(role => {
    const roleName = role.Role ? role.Role.role_name.toLowerCase() : '';
    return ['president', 'secretary', 'treasurer'].some(pstRole => roleName.includes(pstRole));
  });
};

/**
 * Get PST role of user
 * @param {Array} userRoles - Array of user role objects
 * @returns {string|null} PST role or null
 */
const getPSTRole = (userRoles) => {
  for (const role of userRoles) {
    const roleName = role.Role ? role.Role.role_name.toLowerCase() : '';
    if (roleName.includes('president')) return 'President';
    if (roleName.includes('secretary')) return 'Secretary';
    if (roleName.includes('treasurer')) return 'Treasurer';
  }
  return null;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecureToken,
  getUserPermissions,
  hasPermissionLevel,
  isPSTCommitteeMember,
  getPSTRole
};