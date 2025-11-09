const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.heartbeatInterval = 30000; // 30 seconds
    this.init();
  }

  init() {
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  handleConnection(ws, request) {
    // Extract token from query parameters
    const url = new URL(request.url, 'ws://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user_id;

      // Store connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      logger.info(`WebSocket connection established for user ${userId}`);

      // Handle connection events
      ws.on('close', () => {
        this.handleDisconnection(userId, ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.handleDisconnection(userId, ws);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection_established',
        message: 'Connected to DD Diamond Park notification service',
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      ws.close(1008, 'Invalid token');
    }
  }

  handleDisconnection(userId, ws) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }
    logger.info(`WebSocket connection closed for user ${userId}`);
  }

  // Send notification to specific user
  sendToUser(userId, notification) {
    const userConnections = this.clients.get(userId);
    if (!userConnections || userConnections.size === 0) {
      return false;
    }

    const message = JSON.stringify({
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    let sent = false;
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent = true;
      }
    });

    if (sent) {
      logger.debug(`Notification sent to user ${userId}: ${notification.title}`);
    }

    return sent;
  }

  // Broadcast to multiple users
  broadcastToUsers(userIds, notification) {
    let sentCount = 0;
    userIds.forEach(userId => {
      if (this.sendToUser(userId, notification)) {
        sentCount++;
      }
    });

    logger.debug(`Notification broadcasted to ${sentCount}/${userIds.length} users`);
    return sentCount;
  }

  // Send system message to user
  sendSystemMessageToUser(userId, message) {
    const systemMessage = {
      type: 'system_message',
      title: 'System Message',
      message: message,
      priority: 'medium',
      created_at: new Date().toISOString()
    };

    return this.sendToUser(userId, systemMessage);
  }

  // Broadcast system message to all connected users
  broadcastSystemMessage(message) {
    const systemMessage = {
      type: 'system_message',
      title: 'System Message',
      message: message,
      priority: 'medium',
      created_at: new Date().toISOString()
    };

    let sentCount = 0;
    this.clients.forEach((connections, userId) => {
      if (this.sendToUser(userId, systemMessage)) {
        sentCount++;
      }
    });

    logger.info(`System message broadcasted to ${sentCount} users`);
    return sentCount;
  }

  // Get connection count
  getConnectionCount() {
    let totalConnections = 0;
    this.clients.forEach(connections => {
      totalConnections += connections.size;
    });
    return totalConnections;
  }

  // Get connected user count
  getConnectedUserCount() {
    return this.clients.size;
  }

  // Start heartbeat to detect dead connections
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          // Terminate dead connection
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatInterval);
  }

  // Graceful shutdown
  shutdown() {
    logger.info('Shutting down WebSocket server...');

    // Close all connections
    this.wss.clients.forEach(ws => {
      ws.close(1001, 'Server shutting down');
    });

    this.wss.close(() => {
      logger.info('WebSocket server shut down');
    });
  }
}

module.exports = WebSocketServer;