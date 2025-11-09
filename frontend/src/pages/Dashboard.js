import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import PSTDashboard from '../components/dashboard/PSTDashboard';
import OwnerDashboard from '../components/dashboard/OwnerDashboard';
import TenantDashboard from '../components/dashboard/TenantDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data based on user role
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // This would be replaced with actual API calls
      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set mock data for development
      setDashboardData({
        stats: {
          totalUsers: 150,
          totalApartments: 75,
          pendingApprovals: 12,
          activeNotifications: 5
        },
        recentActivities: [],
        priorityQueue: []
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    if (!user || !user.roles || user.roles.length === 0) {
      return <div>Please contact administrator to assign roles.</div>;
    }

    const primaryRole = user.roles[0].role_name;

    switch (primaryRole) {
      case 'Admin':
      case 'Super Admin':
        return <AdminDashboard data={dashboardData} />;
      case 'President':
      case 'Secretary':
      case 'Treasurer':
        return <PSTDashboard data={dashboardData} />;
      case 'Owner':
        return <OwnerDashboard data={dashboardData} />;
      case 'Tenant':
        return <TenantDashboard data={dashboardData} />;
      default:
        return <TenantDashboard data={dashboardData} />;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.first_name}!</p>
      </div>

      <div className="dashboard-content">
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;