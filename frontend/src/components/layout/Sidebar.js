import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/apartments', label: 'Apartments', icon: '🏢' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  // Add admin/PST specific menu items
  if (user?.roles?.some(role => ['Admin', 'President', 'Secretary', 'Treasurer'].includes(role.role_name))) {
    menuItems.push(
      { path: '/users', label: 'Users', icon: '👥' },
      { path: '/approvals', label: 'Approvals', icon: '✅' },
      { path: '/reports', label: 'Reports', icon: '📈' }
    );
  }

  // Add admin only items
  if (user?.roles?.some(role => role.role_name === 'Admin')) {
    menuItems.push(
      { path: '/settings', label: 'Settings', icon: '⚙️' }
    );
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-roles">
          {user?.roles?.map((role, index) => (
            <span key={index} className="role-badge">
              {role.role_name}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;