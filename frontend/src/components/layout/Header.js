import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationBell from '../NotificationBell';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Link to="/dashboard">
            <h1>DD Diamond Park</h1>
          </Link>
        </div>

        <nav className="header-nav">
          <ul>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            {user && (
              <>
                <li>
                  <Link to="/apartments">Apartments</Link>
                </li>
                <li>
                  <Link to="/profile">Profile</Link>
                </li>
                {user.roles?.some(role => ['Admin', 'President', 'Secretary', 'Treasurer'].includes(role.role_name)) && (
                  <>
                    <li>
                      <Link to="/users">Users</Link>
                    </li>
                    <li>
                      <Link to="/approvals">Approvals</Link>
                    </li>
                    <li>
                      <Link to="/reports">Reports</Link>
                    </li>
                  </>
                )}
                {user.roles?.some(role => role.role_name === 'Admin') && (
                  <li>
                    <Link to="/settings">Settings</Link>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>

        <div className="header-actions">
          {user && (
            <>
              <NotificationBell />
              <div className="user-info">
                <span>Welcome, {user.first_name}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;