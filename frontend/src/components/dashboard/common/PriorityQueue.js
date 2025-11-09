import React from 'react';
import './PriorityQueue.css';

const PriorityQueue = ({ items = [], showActions = false }) => {
  const priorityColors = {
    high: '#e74c3c',
    medium: '#f39c12',
    low: '#27ae60'
  };

  const mockItems = [
    {
      id: 1,
      title: 'Maintenance Request - Plumbing Issue',
      priority: 'high',
      submittedBy: 'John Doe',
      apartment: '5A',
      submittedDate: '2024-01-15',
      description: 'Leaking faucet in kitchen'
    },
    {
      id: 2,
      title: 'Parking Slot Assignment',
      priority: 'medium',
      submittedBy: 'Jane Smith',
      apartment: '3B',
      submittedDate: '2024-01-14',
      description: 'Request for additional parking space'
    },
    {
      id: 3,
      title: 'Tenant Approval Request',
      priority: 'low',
      submittedBy: 'Bob Johnson',
      apartment: '7C',
      submittedDate: '2024-01-13',
      description: 'New tenant background check approval'
    }
  ];

  const displayItems = items.length > 0 ? items : mockItems;

  return (
    <div className="priority-queue">
      <div className="queue-header">
        <h4>Priority Queue</h4>
        <span className="queue-count">{displayItems.length} items</span>
      </div>

      <div className="queue-list">
        {displayItems.map((item) => (
          <div key={item.id} className="queue-item">
            <div className="item-priority">
              <span
                className="priority-indicator"
                style={{ backgroundColor: priorityColors[item.priority] }}
              ></span>
            </div>

            <div className="item-content">
              <div className="item-title">{item.title}</div>
              <div className="item-details">
                <span className="item-submitter">{item.submittedBy}</span>
                <span className="item-apartment">Apt {item.apartment}</span>
                <span className="item-date">{item.submittedDate}</span>
              </div>
              <div className="item-description">{item.description}</div>
            </div>

            {showActions && (
              <div className="item-actions">
                <button className="btn-approve">Approve</button>
                <button className="btn-reject">Reject</button>
                <button className="btn-view">View</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {displayItems.length === 0 && (
        <div className="empty-queue">
          <p>No items in priority queue</p>
        </div>
      )}
    </div>
  );
};

export default PriorityQueue;