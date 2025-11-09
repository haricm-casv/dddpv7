const notificationService = require('./notificationService');
const models = require('../models');
const logger = require('../utils/logger');

/**
 * Notification triggers for approval workflows and system events
 */
class NotificationTriggers {
  // Registration-related notifications
  async notifyNewRegistration(userId, userData) {
    try {
      const pstMembers = await notificationService.getPSTMembers();

      const notifications = pstMembers.map(pst => ({
        userId: pst.id,
        type: 'new_registration_request',
        title: 'New Registration Request',
        message: `${userData.full_name} has submitted a registration request for apartment ${userData.apartment_name} as ${userData.primary_role}`,
        linkUrl: `/approvals/registration/${userId}`,
        priority: 'high',
        sendEmail: true,
        sentByRole: 'System'
      }));

      await notificationService.createBulkNotifications(notifications);
      logger.info(`New registration notification sent for user ${userId}`);
    } catch (error) {
      logger.error('Error sending new registration notification:', error);
    }
  }

  async notifyRegistrationDecision(userId, decision, approvedBy) {
    try {
      const status = decision === 'approved' ? 'approved' : 'rejected';
      const title = `Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      const message = decision === 'approved'
        ? `Your registration has been approved by ${approvedBy.role}. You can now log in with your temporary password.`
        : `Your registration has been rejected by ${approvedBy.role}. Reason: ${approvedBy.reason || 'Not specified'}`;

      await notificationService.createNotification({
        userId,
        type: `registration_${status}`,
        title,
        message,
        linkUrl: '/profile',
        priority: 'high',
        sentByUserId: approvedBy.userId,
        sentByRole: approvedBy.role
      });

      logger.info(`Registration decision notification sent to user ${userId}: ${status}`);
    } catch (error) {
      logger.error('Error sending registration decision notification:', error);
    }
  }

  // Ownership transfer notifications
  async notifyTransferRequest(transferData) {
    try {
      const pstMembers = await notificationService.getPSTMembers();

      const notifications = pstMembers.map(pst => ({
        userId: pst.id,
        type: 'transfer_request_submitted',
        title: 'Ownership Transfer Request',
        message: `${transferData.fromUserName} wants to transfer ${transferData.percentage}% ownership of apartment ${transferData.apartmentName} to ${transferData.toUserName}`,
        linkUrl: `/approvals/transfer/${transferData.transferId}`,
        priority: 'critical',
        sendEmail: true,
        sentByUserId: transferData.fromUserId,
        sentByRole: 'Owner'
      }));

      await notificationService.createBulkNotifications(notifications);
      logger.info(`Transfer request notification sent for transfer ${transferData.transferId}`);
    } catch (error) {
      logger.error('Error sending transfer request notification:', error);
    }
  }

  async notifyTransferDecision(transferData, decision, pstMember) {
    try {
      const notifications = [
        // Notify transferor
        {
          userId: transferData.fromUserId,
          type: `transfer_${decision}`,
          title: `Ownership Transfer ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
          message: decision === 'approved'
            ? `Your ownership transfer request for apartment ${transferData.apartmentName} has been ${decision} by ${pstMember.role} ${pstMember.name}. ${transferData.instantCompletion ? 'The transfer has been completed immediately.' : 'The transfer will be processed shortly.'}`
            : `Your ownership transfer request for apartment ${transferData.apartmentName} has been ${decision} by ${pstMember.role} ${pstMember.name}`,
          linkUrl: '/transfers',
          priority: decision === 'approved' ? 'high' : 'medium',
          sentByUserId: pstMember.id,
          sentByRole: pstMember.role
        },
        // Notify transferee
        {
          userId: transferData.toUserId,
          type: `transfer_${decision}`,
          title: `Ownership Transfer ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
          message: decision === 'approved'
            ? `Ownership transfer request for apartment ${transferData.apartmentName} has been ${decision} by ${pstMember.role} ${pstMember.name}. ${transferData.instantCompletion ? 'The transfer has been completed immediately.' : 'The transfer will be processed shortly.'}`
            : `Ownership transfer request for apartment ${transferData.apartmentName} has been ${decision} by ${pstMember.role} ${pstMember.name}`,
          linkUrl: '/transfers',
          priority: decision === 'approved' ? 'high' : 'medium',
          sentByUserId: pstMember.id,
          sentByRole: pstMember.role
        }
      ];

      for (const notification of notifications) {
        await notificationService.createNotification(notification);
      }

      logger.info(`Transfer decision notifications sent for transfer ${transferData.transferId}: ${decision}`);
    } catch (error) {
      logger.error('Error sending transfer decision notifications:', error);
    }
  }

  // Security and password notifications
  async notifyPasswordResetRequired(userId) {
    try {
      await notificationService.createNotification({
        userId,
        type: 'password_reset_required',
        title: 'Password Reset Required',
        message: 'You must reset your password before continuing. This is required for security purposes.',
        linkUrl: '/change-password',
        priority: 'critical',
        sentByRole: 'System'
      });

      logger.info(`Password reset required notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending password reset notification:', error);
    }
  }

  async notifyWeakPassword(userId) {
    try {
      await notificationService.createNotification({
        userId,
        type: 'weak_password_warning',
        title: 'Password Security Warning',
        message: 'Your current password does not meet security requirements. Please update it to continue using the system.',
        linkUrl: '/change-password',
        priority: 'medium',
        sentByRole: 'System'
      });

      logger.info(`Weak password warning sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending weak password notification:', error);
    }
  }

  // Lease management notifications
  async notifyLeaseExpiration(tenantId, ownerIds, apartmentName, daysUntilExpiration) {
    try {
      const reminders = [
        { days: 30, priority: 'high' },
        { days: 15, priority: 'high' },
        { days: 7, priority: 'critical' },
        { days: 1, priority: 'critical' }
      ];

      const reminder = reminders.find(r => r.days === daysUntilExpiration);
      if (!reminder) return;

      const title = `Lease Expiration Notice - ${daysUntilExpiration} days`;
      const message = `Lease for apartment ${apartmentName} expires in ${daysUntilExpiration} days.`;

      // Notify tenant
      await notificationService.createNotification({
        userId: tenantId,
        type: 'lease_expiration_reminder',
        title,
        message: `${message} Please contact your owner to discuss renewal.`,
        linkUrl: '/profile',
        priority: reminder.priority,
        sentByRole: 'System'
      });

      // Notify owners
      for (const ownerId of ownerIds) {
        await notificationService.createNotification({
          userId: ownerId,
          type: 'lease_expiration_reminder',
          title,
          message: `${message} Please contact your tenant regarding renewal.`,
          linkUrl: '/apartments',
          priority: reminder.priority,
          sentByRole: 'System'
        });
      }

      logger.info(`Lease expiration notifications sent for apartment ${apartmentName}, ${daysUntilExpiration} days remaining`);
    } catch (error) {
      logger.error('Error sending lease expiration notifications:', error);
    }
  }

  // PST-specific notifications
  async notifyPSTPendingQueue() {
    try {
      // Check for requests pending > 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const pendingRequests = await models.OwnershipTransfer.count({
        where: {
          status: 'pending',
          created_at: { [models.Sequelize.Op.lt]: twentyFourHoursAgo }
        }
      });

      if (pendingRequests > 0) {
        const pstMembers = await notificationService.getPSTMembers();

        const notifications = pstMembers.map(pst => ({
          userId: pst.id,
          type: 'pending_queue_alert',
          title: 'Pending Approvals Alert',
          message: `There are ${pendingRequests} approval requests pending for more than 24 hours. Please review them urgently.`,
          linkUrl: '/approvals',
          priority: 'high',
          sentByRole: 'System'
        }));

        await notificationService.createBulkNotifications(notifications);
        logger.info(`PST pending queue alert sent: ${pendingRequests} pending requests`);
      }
    } catch (error) {
      logger.error('Error sending PST pending queue alert:', error);
    }
  }

  async notifyPSTEmergency(emergencyData) {
    try {
      const pstMembers = await notificationService.getPSTMembers();

      const notifications = pstMembers.map(pst => ({
        userId: pst.id,
        type: 'emergency_decision_required',
        title: 'Emergency Decision Required',
        message: `URGENT: ${emergencyData.title} - ${emergencyData.description}`,
        linkUrl: emergencyData.linkUrl,
        priority: 'critical',
        sendEmail: true,
        sendSMS: true,
        sentByUserId: emergencyData.raisedBy,
        sentByRole: emergencyData.raisedByRole
      }));

      await notificationService.createBulkNotifications(notifications);
      logger.info(`PST emergency notification sent: ${emergencyData.title}`);
    } catch (error) {
      logger.error('Error sending PST emergency notification:', error);
    }
  }

  // System event notifications
  async notifySystemMaintenance(startTime, endTime, message) {
    try {
      // This would be sent to all users, but for now we'll send to PST members
      const pstMembers = await notificationService.getPSTMembers();

      const notifications = pstMembers.map(pst => ({
        userId: pst.id,
        type: 'system_maintenance',
        title: 'System Maintenance Notice',
        message: `Scheduled maintenance from ${startTime} to ${endTime}. ${message}`,
        priority: 'medium',
        sentByRole: 'System'
      }));

      await notificationService.createBulkNotifications(notifications);
      logger.info('System maintenance notification sent to PST members');
    } catch (error) {
      logger.error('Error sending system maintenance notification:', error);
    }
  }

  async notifyUserRoleChanged(userId, oldRole, newRole, changedBy) {
    try {
      await notificationService.createNotification({
        userId,
        type: 'role_changed',
        title: 'Role Updated',
        message: `Your role has been changed from ${oldRole} to ${newRole} by ${changedBy.name}`,
        linkUrl: '/profile',
        priority: 'medium',
        sentByUserId: changedBy.id,
        sentByRole: changedBy.role
      });

      logger.info(`Role change notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending role change notification:', error);
    }
  }

  async notifyUserActivated(userId, activatedBy) {
    try {
      await notificationService.createNotification({
        userId,
        type: 'account_activated',
        title: 'Account Activated',
        message: 'Your account has been activated. You can now access all system features.',
        linkUrl: '/dashboard',
        priority: 'medium',
        sentByUserId: activatedBy.id,
        sentByRole: activatedBy.role
      });

      logger.info(`Account activation notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending account activation notification:', error);
    }
  }

  async notifyUserDeactivated(userId, deactivatedBy) {
    try {
      await notificationService.createNotification({
        userId,
        type: 'account_deactivated',
        title: 'Account Deactivated',
        message: 'Your account has been deactivated. Please contact an administrator if you believe this is an error.',
        priority: 'high',
        sentByUserId: deactivatedBy.id,
        sentByRole: deactivatedBy.role
      });

      logger.info(`Account deactivation notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending account deactivation notification:', error);
    }
  }
}

module.exports = new NotificationTriggers();