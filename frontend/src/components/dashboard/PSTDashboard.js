import React from 'react';
import DashboardCard from './common/DashboardCard';
import StatsGrid from './common/StatsGrid';
import PriorityQueue from './common/PriorityQueue';
import ApprovalWorkflows from './common/ApprovalWorkflows';
import RecentActivities from './common/RecentActivities';
import './PSTDashboard.css';

const PSTDashboard = ({ data }) => {
  const stats = data?.stats || {
    pendingApprovals: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalMembers: 0,
    upcomingMeetings: 0,
    urgentItems: 0
  };

  return (
    <div className="pst-dashboard">
      <div className="dashboard-section">
        <h2>PST Committee Dashboard</h2>
        <StatsGrid stats={[
          { title: 'Pending Approvals', value: stats.pendingApprovals, icon: '⏳', color: '#f39c12' },
          { title: 'Approved Today', value: stats.approvedToday, icon: '✅', color: '#27ae60' },
          { title: 'Rejected Today', value: stats.rejectedToday, icon: '❌', color: '#e74c3c' },
          { title: 'Total Members', value: stats.totalMembers, icon: '👥', color: '#3498db' },
          { title: 'Upcoming Meetings', value: stats.upcomingMeetings, icon: '📅', color: '#9b59b6' },
          { title: 'Urgent Items', value: stats.urgentItems, icon: '🚨', color: '#e67e22' }
        ]} />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h3>Priority Queue</h3>
          <PriorityQueue items={data?.priorityQueue || []} showActions={true} />
        </div>

        <div className="dashboard-section">
          <h3>Approval Workflows</h3>
          <ApprovalWorkflows workflows={data?.workflows || []} showActions={true} />
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Recent Committee Activities</h3>
        <RecentActivities activities={data?.recentActivities || []} />
      </div>

      <div className="dashboard-grid">
        <DashboardCard title="Meeting Management" className="pst-card">
          <div className="card-content">
            <p>Schedule and manage PST committee meetings</p>
            <div className="card-actions">
              <button className="btn-primary">Schedule Meeting</button>
              <button className="btn-secondary">View Minutes</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Approval Policies" className="pst-card">
          <div className="card-content">
            <p>Review and update approval policies</p>
            <div className="card-actions">
              <button className="btn-primary">Update Policies</button>
              <button className="btn-secondary">View Guidelines</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Member Communications" className="pst-card">
          <div className="card-content">
            <p>Send notifications to apartment owners</p>
            <div className="card-actions">
              <button className="btn-primary">Send Notice</button>
              <button className="btn-secondary">Communication Log</button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Financial Overview" className="pst-card">
          <div className="card-content">
            <p>Monitor maintenance fund and expenses</p>
            <div className="card-actions">
              <button className="btn-primary">View Budget</button>
              <button className="btn-secondary">Expense Reports</button>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default PSTDashboard;