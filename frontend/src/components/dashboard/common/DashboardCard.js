import React from 'react';
import './DashboardCard.css';

const DashboardCard = ({ title, children, className = '' }) => {
  return (
    <div className={`dashboard-card ${className}`}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;