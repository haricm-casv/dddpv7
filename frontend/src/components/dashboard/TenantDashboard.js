import React from 'react';
import DashboardCard from './common/DashboardCard';
import StatsGrid from './common/StatsGrid';
import RecentActivities from './common/RecentActivities';
import './TenantDashboard.css';

const TenantDashboard = ({ data }) => {
  const stats = data?.stats || {
    rentDue: 0,
    rentPaid: 0,
    maintenanceRequests: 0,
    notices: 0,
    leaseEnd: 'N/A',
    parkingSlot: 'N/A'
  };

  return (
    <div className="tenant-dashboard">
      <div className="dashboard-section">
        <h2>Tenant Dashboard</h2>
        <StatsGrid stats={[
          { title: 'Rent Due', value: `₹${stats.rentDue}`, icon: '💰', color: stats.rentDue > 0 ? '#e74c3c' : '#27ae60' },
          { title: 'Rent Paid', value: `₹${stats.rentPaid}`, icon: '✅', color: '#27ae60' },
          { title: 'Maintenance Requests', value: stats.maintenanceRequests, icon: '🔧', color: '#f39c12' },
          { title: 'Notices', value: stats.notices, icon: '📄', color: '#3498db' },
          { title: 'Lease End Date', value: stats.leaseEnd, icon: '📅', color: '#9b59b6' },
          { title: 'Parking Slot', value: stats.parkingSlot, icon: '🚗', color: '#e67e22' }
        ]} />
      </div>

      <div className="dashboard-grid">
        <DashboardCard title="Rent Payment" className="tenant-card">
          <div className="card-content">
            <p>Pay rent and view payment history</p>
            <div className="card-actions">
              <button className="btn-primary">Pay Rent</button>
              <button className="btn-secondary">Payment History</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Maintenance" className="tenant-card">
          <div className="card-content">
            <p>Report issues and track maintenance requests</p>
            <div className="card-actions">
              <button className="btn-primary">Report Issue</button>
              <button className="btn-secondary">View Requests</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Lease Information" className="tenant-card">
          <div className="card-content">
            <p>View lease details and important dates</p>
            <div className="card-actions">
              <button className="btn-primary">View Lease</button>
              <button className="btn-secondary">Renewal Info</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Notices & Communications" className="tenant-card">
          <div className="card-content">
            <p>Read important notices from management</p>
            <div className="card-actions">
              <button className="btn-primary">View Notices</button>
              <button className="btn-secondary">Contact Owner</button>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="dashboard-section">
        <h3>Recent Activities</h3>
        <RecentActivities activities={data?.recentActivities || []} />
      </div>

      <div className="dashboard-grid">
        <DashboardCard title="Apartment Details" className="tenant-card">
          <div className="card-content">
            <p>View your apartment information and amenities</p>
            <div className="card-actions">
              <button className="btn-primary">View Details</button>
              <button className="btn-secondary">Floor Plan</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Community" className="tenant-card">
          <div className="card-content">
            <p>Connect with other residents and PST committee</p>
            <div className="card-actions">
              <button className="btn-primary">Directory</button>
              <button className="btn-secondary">Contact PST</button>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default TenantDashboard;