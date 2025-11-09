import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Filter, Search, X } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});

  // Filters
  const [filters, setFilters] = useState({
    is_read: 'all', // all, unread, read
    priority: 'all', // all, low, medium, high, critical
    type: 'all', // all, or specific types
    search: ''
  });

  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  // Load notifications
  const loadNotifications = async (page = 1, append = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (filters.is_read !== 'all') queryParams.append('is_read', filters.is_read === 'unread' ? 'false' : 'true');
      if (filters.priority !== 'all') queryParams.append('priority', filters.priority);
      if (filters.type !== 'all') queryParams.append('type', filters.type);

      const response = await fetch(`/api/v1/notifications?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (append) {
          setNotifications(prev => [...prev, ...data.data.notifications]);
        } else {
          setNotifications(data.data.notifications);
        }
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notification stats
  const loadStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let filtered = [...notifications];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm) ||
        notification.message.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filters.search]);

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadStats();
  }, []);

  // Reload when filters change (except search)
  useEffect(() => {
    if (filters.is_read !== 'all' || filters.priority !== 'all' || filters.type !== 'all') {
      loadNotifications();
    }
  }, [filters.is_read, filters.priority, filters.type]);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );

      // Update stats
      loadStats();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch('/api/v1/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
      );

      // Clear selection
      setSelectedNotifications(new Set());

      // Update stats
      loadStats();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setSelectedNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });

      // Update stats
      loadStats();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.link_url) {
      window.location.href = notification.link_url;
    }
  };

  const toggleSelection = (notificationId) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
  };

  const clearSelection = () => {
    setSelectedNotifications(new Set());
  };

  const bulkMarkAsRead = async () => {
    for (const id of selectedNotifications) {
      await markAsRead(id);
    }
    setSelectedNotifications(new Set());
  };

  const bulkDelete = async () => {
    for (const id of selectedNotifications) {
      await deleteNotification(id);
    }
    setSelectedNotifications(new Set());
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'critical': return 'priority-critical';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="notification-center">
      <div className="notification-header">
        <div className="header-left">
          <h1><Bell size={24} /> Notification Center</h1>
          <div className="stats">
            <span className="stat-item">Total: {stats.total || 0}</span>
            <span className="stat-item unread">Unread: {stats.unread || 0}</span>
          </div>
        </div>
        <div className="header-right">
          <NotificationBell />
        </div>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search notifications..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filters.is_read}
            onChange={(e) => setFilters(prev => ({ ...prev, is_read: e.target.value }))}
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            className="mark-all-read-btn"
            onClick={markAllAsRead}
            disabled={stats.unread === 0}
          >
            <CheckCheck size={16} />
            Mark All Read
          </button>
        </div>
      </div>

      {selectedNotifications.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedNotifications.size} selected</span>
          <div className="bulk-buttons">
            <button onClick={bulkMarkAsRead}>
              <Check size={16} /> Mark as Read
            </button>
            <button onClick={bulkDelete} className="delete-btn">
              <X size={16} /> Delete
            </button>
            <button onClick={clearSelection}>Clear Selection</button>
          </div>
        </div>
      )}

      <div className="notifications-list">
        {loading && notifications.length === 0 ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications found</h3>
            <p>You don't have any notifications matching your current filters.</p>
          </div>
        ) : (
          <>
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getPriorityClass(notification.priority)} ${selectedNotifications.has(notification.id) ? 'selected' : ''}`}
              >
                <div className="notification-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => toggleSelection(notification.id)}
                  />
                </div>

                <div
                  className="notification-content"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-header">
                    <h4 className="notification-title">{notification.title}</h4>
                    <div className="notification-actions">
                      <span className="notification-time">
                        {formatTime(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <button
                          className="mark-read-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        title="Delete notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="notification-message">{notification.message}</p>

                  <div className="notification-meta">
                    <span className={`priority-badge ${getPriorityClass(notification.priority)}`}>
                      {notification.priority.toUpperCase()}
                    </span>
                    {notification.sentBy && (
                      <span className="sent-by">
                        by {notification.sentBy.full_name}
                      </span>
                    )}
                    {notification.link_url && (
                      <span className="has-link">Click to view</span>
                    )}
                  </div>
                </div>

                {!notification.is_read && <div className="unread-indicator"></div>}
              </div>
            ))}

            {pagination.page < pagination.total_pages && (
              <div className="load-more">
                <button
                  onClick={() => loadNotifications(pagination.page + 1, true)}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;