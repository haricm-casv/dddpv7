import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to DD Diamond Park</h1>
          <p>A modern apartment management system for our community</p>
          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary">Login</Link>
            <Link to="/register" className="btn btn-secondary">Register</Link>
          </div>
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏢</div>
              <h3>Apartment Management</h3>
              <p>Manage apartments, tenants, and ownership relationships</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>User Roles</h3>
              <p>Role-based access for Owners, Tenants, and PST Committee</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3>Approval Workflows</h3>
              <p>Streamlined approval processes for maintenance and changes</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Dashboard Analytics</h3>
              <p>Comprehensive dashboards with real-time statistics</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3>Notifications</h3>
              <p>Stay updated with important announcements and updates</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Access</h3>
              <p>Secure authentication and permission-based access control</p>
            </div>
          </div>
        </div>
      </div>

      <div className="about-section">
        <div className="container">
          <h2>About DD Diamond Park</h2>
          <p>
            DD Diamond Park is a premium residential complex offering modern living spaces
            with world-class amenities. Our management system ensures smooth operations,
            transparent communication, and efficient service delivery for all residents.
          </p>
          <p>
            Whether you're an owner, tenant, or part of our PST committee, our platform
            provides the tools you need to manage your apartment community effectively.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;