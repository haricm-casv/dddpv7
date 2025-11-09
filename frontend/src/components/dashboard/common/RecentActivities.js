import React from 'react';
import './RecentActivities.css';

const RecentActivities = ({ activities = [] }) => {
  const mockActivities = [
    {
      id: 1,
      type: 'approval',
      title: 'Tenant application approved',
      description: 'John Doe approved for Apartment 5A',
      timestamp: '2024-01-15 14:30',
      user: 'PST Committee'
    },
    {
      id: 2,
      type: 'maintenance',
      title: 'Maintenance request submitted',
      description: 'Plumbing issue reported in Apartment 3B',
      timestamp: '2024-01-15 11:15',
      user: 'Jane Smith'
    },
    {
      id: 3,
      type: 'payment',
      title: 'Rent payment received',
      description: 'Monthly rent collected for Apartment 7C',
      timestamp: '2024-01-15 09:45',
      user: 'Bob Johnson'
    },
    {
      id: 4,
      type: 'notification',
      title: 'Meeting scheduled',
      description: 'PST Committee meeting on January 20th',
      timestamp: '2024-01-14 16:20',
      user: 'Secretary'
    },
    {
      id: 5,
      type: 'user',
      title: 'New user registered',
      description: 'Alice Wilson joined as tenant',
      timestamp: '2024-01-14 13:10',
      user: 'System'
    }
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  const getActivityIcon = (type) => {
    const icons = {
      approval: '✅',
      maintenance: '🔧',
      payment: '💰',
      notification: '📢',
      user: '👤'
    };
    return icons[type] || '📝';
  };

  return (
    <div className="recent-activities">
      <div className="activities-list">
        {displayActivities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-icon">
              <span>{getActivityIcon(activity.type)}</span>
            </div>

            <div className="activity-content">
              <div className="activity-title">{activity.title}</div>
              <div className="activity-description">{activity.description}</div>
              <div className="activity-meta">
                <span className="activity-user">{activity.user}</span>
                <span className="activity-time">{activity.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayActivities.length === 0 && (
        <div className="empty-activities">
          <p>No recent activities</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivities;