import React from 'react';
import DashboardCard from './common/DashboardCard';
import StatsGrid from './common/StatsGrid';
import RecentActivities from './common/RecentActivities';
import './OwnerDashboard.css';

const OwnerDashboard = ({ data }) => {
  const stats = data?.stats || {
    ownedApartments: 0,
    tenantCount: 0,
    pendingRent: 0,
    maintenanceRequests: 0,
    parkingSlots: 0,
    monthlyIncome: 0
  };

  return (
    <div className="owner-dashboard">
      <div className="dashboard-section">
        <h2>Owner Dashboard</h2>
        <StatsGrid stats={[
          { title: 'Owned Apartments', value: stats.ownedApartments, icon: '🏢', color: '#3498db' },
          { title: 'Active Tenants', value: stats.tenantCount, icon: '👥', color: '#2ecc71' },
          { title: 'Pending Rent', value: `₹${stats.pendingRent}`, icon: '💰', color: '#f39c12' },
          { title: 'Maintenance Requests', value: stats.maintenanceRequests, icon: '🔧', color: '#e74c3c' },
          { title: 'Parking Slots', value: stats.parkingSlots, icon: '🚗', color: '#9b59b6' },
          { title: 'Monthly Income', value: `₹${stats.monthlyIncome}`, icon: '📈', color: '#27ae60' }
        ]} />
      </div>

      <div className="dashboard-grid">
        <DashboardCard title="Apartment Management" className="owner-card">
          <div className="card-content">
            <p>Manage your apartment properties and tenants</p>
            <div className="card-actions">
              <button className="btn-primary">View Apartments</button>
              <button className="btn-secondary">Add Tenant</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Rent Collection" className="owner-card">
          <div className="card-content">
            <p>Track rent payments and generate invoices</p>
            <div className="card-actions">
              <button className="btn-primary">Collect Rent</button>
              <button className="btn-secondary">Payment History</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Maintenance" className="owner-card">
          <div className="card-content">
            <p>Submit and track maintenance requests</p>
            <div className="card-actions">
              <button className="btn-primary">New Request</button>
              <button className="btn-secondary">View Status</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Parking Management" className="owner-card">
          <div className="card-content">
            <p>Manage parking slot assignments</p>
            <div className="card-actions">
              <button className="btn-primary">Assign Slots</button>
              <button className="btn-secondary">View Assignments</button>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="dashboard-section">
        <h3>Recent Activities</h3>
        <RecentActivities activities={data?.recentActivities || []} />
      </div>

      <div className="dashboard-grid">
        <DashboardCard title="Financial Reports" className="owner-card">
          <div className="card-content">
            <p>View income statements and expense reports</p>
            <div className="card-actions">
              <button className="btn-primary">View Reports</button>
              <button className="btn-secondary">Export Data</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Tenant Communications" className="owner-card">
          <div className="card-content">
            <p>Send notices and communicate with tenants</p>
            <div className="card-actions">
              <button className="btn-primary">Send Notice</button>
              <button className="btn-secondary">Message History</button>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default OwnerDashboard;