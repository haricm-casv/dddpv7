import React from 'react';
import DashboardCard from './common/DashboardCard';
import StatsGrid from './common/StatsGrid';
import RecentActivities from './common/RecentActivities';
import PriorityQueue from './common/PriorityQueue';
import ApprovalWorkflows from './common/ApprovalWorkflows';
import './AdminDashboard.css';

const AdminDashboard = ({ data }) => {
  const stats = data?.stats || {
    totalUsers: 0,
    totalApartments: 0,
    pendingApprovals: 0,
    activeNotifications: 0,
    systemHealth: 'Good',
    lastBackup: '2 hours ago'
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-section">
        <h2>System Overview</h2>
        <StatsGrid stats={[
          { title: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#3498db' },
          { title: 'Total Apartments', value: stats.totalApartments, icon: '🏢', color: '#2ecc71' },
          { title: 'Pending Approvals', value: stats.pendingApprovals, icon: '⏳', color: '#f39c12' },
          { title: 'Active Notifications', value: stats.activeNotifications, icon: '🔔', color: '#e74c3c' },
          { title: 'System Health', value: stats.systemHealth, icon: '💚', color: '#27ae60' },
          { title: 'Last Backup', value: stats.lastBackup, icon: '💾', color: '#9b59b6' }
        ]} />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h3>PST Priority Queue</h3>
          <PriorityQueue items={data?.priorityQueue || []} />
        </div>

        <div className="dashboard-section">
          <h3>Approval Workflows</h3>
          <ApprovalWorkflows workflows={data?.workflows || []} />
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Recent System Activities</h3>
        <RecentActivities activities={data?.recentActivities || []} />
      </div>

      <div className="dashboard-grid">
        <DashboardCard title="User Management" className="admin-card">
          <div className="card-actions">
            <button className="btn-primary">Manage Users</button>
            <button className="btn-secondary">Role Assignments</button>
          </div>
        </DashboardCard>

        <DashboardCard title="System Settings" className="admin-card">
          <div className="card-actions">
            <button className="btn-primary">System Config</button>
            <button className="btn-secondary">Backup & Restore</button>
          </div>
        </DashboardCard>

        <DashboardCard title="Reports & Analytics" className="admin-card">
          <div className="card-actions">
            <button className="btn-primary">Generate Reports</button>
            <button className="btn-secondary">View Analytics</button>
          </div>
        </DashboardCard>

        <DashboardCard title="Security & Audit" className="admin-card">
          <div className="card-actions">
            <button className="btn-primary">Audit Logs</button>
            <button className="btn-secondary">Security Settings</button>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default AdminDashboard;