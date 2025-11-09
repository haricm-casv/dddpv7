import React, { useState, useEffect } from 'react';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Mock data for development
      const mockUsers = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          roles: [{ role_name: 'Owner' }],
          is_active: true,
          created_at: '2024-01-15'
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          roles: [{ role_name: 'Tenant' }],
          is_active: true,
          created_at: '2024-01-14'
        },
        {
          id: 3,
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob.johnson@example.com',
          roles: [{ role_name: 'President' }],
          is_active: true,
          created_at: '2024-01-13'
        }
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.first_name} ${user.last_name} ${user.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.roles.some(role => role.role_name === selectedRole);
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (roleName) => {
    const colors = {
      'Admin': '#dc3545',
      'President': '#e67e22',
      'Secretary': '#e67e22',
      'Treasurer': '#e67e22',
      'Owner': '#27ae60',
      'Tenant': '#3498db',
      'Resident': '#95a5a6'
    };
    return colors[roleName] || '#95a5a6';
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn btn-primary">Add New User</button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="role-filter">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="President">President</option>
            <option value="Secretary">Secretary</option>
            <option value="Treasurer">Treasurer</option>
            <option value="Owner">Owner</option>
            <option value="Tenant">Tenant</option>
            <option value="Resident">Resident</option>
          </select>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{`${user.first_name} ${user.last_name}`}</td>
                <td>{user.email}</td>
                <td>
                  <div className="role-badges">
                    {user.roles.map((role, index) => (
                      <span
                        key={index}
                        className="role-badge"
                        style={{ backgroundColor: getRoleBadgeColor(role.role_name) }}
                      >
                        {role.role_name}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-secondary btn-sm">Edit</button>
                    <button className="btn btn-danger btn-sm">Deactivate</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-results">
          <p>No users found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Users;