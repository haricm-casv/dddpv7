import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      siteName: 'DD Diamond Park',
      contactEmail: 'admin@dddiamondpark.com',
      maintenanceMode: false,
      allowRegistration: true
    },
    security: {
      sessionTimeout: 30,
      passwordMinLength: 8,
      twoFactorAuth: false,
      loginAttempts: 5
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      maintenanceAlerts: true,
      approvalAlerts: true
    },
    approvals: {
      autoApproveMaintenance: false,
      requireDualApproval: true,
      budgetLimit: 50000
    }
  });

  // Profession management state
  const [professions, setProfessions] = useState([]);
  const [loadingProfessions, setLoadingProfessions] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfession, setEditingProfession] = useState(null);
  const [professionForm, setProfessionForm] = useState({
    name: '',
    is_active: true
  });

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const saveSettings = () => {
    // Mock save functionality
    alert('Settings saved successfully!');
  };

  // Profession management functions
  useEffect(() => {
    if (activeTab === 'professions') {
      fetchProfessions();
    }
  }, [activeTab]);

  const fetchProfessions = async () => {
    setLoadingProfessions(true);
    try {
      const response = await axios.get('/api/v1/professions?is_active=all&include_custom=true');
      setProfessions(response.data.data.professions.predefined.concat(response.data.data.professions.custom));
    } catch (error) {
      console.error('Error fetching professions:', error);
      toast.error('Failed to load professions');
    } finally {
      setLoadingProfessions(false);
    }
  };

  const handleProfessionFormChange = (field, value) => {
    setProfessionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetProfessionForm = () => {
    setProfessionForm({
      name: '',
      is_active: true
    });
    setEditingProfession(null);
    setShowCreateForm(false);
  };

  const handleCreateProfession = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/professions', {
        name: professionForm.name.trim()
      });
      toast.success('Profession created successfully');
      resetProfessionForm();
      fetchProfessions();
    } catch (error) {
      console.error('Error creating profession:', error);
      if (error.response?.data?.error?.message) {
        toast.error(error.response.data.error.message);
      } else {
        toast.error('Failed to create profession');
      }
    }
  };

  const handleEditProfession = (profession) => {
    setEditingProfession(profession);
    setProfessionForm({
      name: profession.name,
      is_active: profession.is_active
    });
    setShowCreateForm(true);
  };

  const handleUpdateProfession = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/v1/professions/${editingProfession.id}`, {
        name: professionForm.name.trim(),
        is_active: professionForm.is_active
      });
      toast.success('Profession updated successfully');
      resetProfessionForm();
      fetchProfessions();
    } catch (error) {
      console.error('Error updating profession:', error);
      if (error.response?.data?.error?.message) {
        toast.error(error.response.data.error.message);
      } else {
        toast.error('Failed to update profession');
      }
    }
  };

  const handleDeleteProfession = async (profession) => {
    if (!window.confirm(`Are you sure you want to delete "${profession.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/v1/professions/${profession.id}`);
      toast.success('Profession deleted successfully');
      fetchProfessions();
    } catch (error) {
      console.error('Error deleting profession:', error);
      if (error.response?.data?.error?.message) {
        toast.error(error.response.data.error.message);
      } else {
        toast.error('Failed to delete profession');
      }
    }
  };

  const handleToggleStatus = async (profession) => {
    try {
      await axios.put(`/api/v1/professions/${profession.id}`, {
        is_active: !profession.is_active
      });
      toast.success(`Profession ${!profession.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchProfessions();
    } catch (error) {
      console.error('Error toggling profession status:', error);
      toast.error('Failed to update profession status');
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'approvals', name: 'Approvals', icon: '✅' },
    { id: 'professions', name: 'Professions', icon: '👥' },
    { id: 'maintenance', name: 'Maintenance', icon: '🔧' }
  ];

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>System Settings</h1>
        <button className="btn btn-primary" onClick={saveSettings}>
          Save Changes
        </button>
      </div>

      <div className="settings-content">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-name">{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="settings-panel">
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>General Settings</h3>

              <div className="setting-group">
                <label htmlFor="siteName">Site Name</label>
                <input
                  type="text"
                  id="siteName"
                  value={settings.general.siteName}
                  onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
                />
              </div>

              <div className="setting-group">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  value={settings.general.contactEmail}
                  onChange={(e) => handleSettingChange('general', 'contactEmail', e.target.value)}
                />
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.general.maintenanceMode}
                    onChange={(e) => handleSettingChange('general', 'maintenanceMode', e.target.checked)}
                  />
                  Enable Maintenance Mode
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.general.allowRegistration}
                    onChange={(e) => handleSettingChange('general', 'allowRegistration', e.target.checked)}
                  />
                  Allow New User Registration
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h3>Security Settings</h3>

              <div className="setting-group">
                <label htmlFor="sessionTimeout">Session Timeout (minutes)</label>
                <input
                  type="number"
                  id="sessionTimeout"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                />
              </div>

              <div className="setting-group">
                <label htmlFor="passwordMinLength">Minimum Password Length</label>
                <input
                  type="number"
                  id="passwordMinLength"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                />
              </div>

              <div className="setting-group">
                <label htmlFor="loginAttempts">Maximum Login Attempts</label>
                <input
                  type="number"
                  id="loginAttempts"
                  value={settings.security.loginAttempts}
                  onChange={(e) => handleSettingChange('security', 'loginAttempts', parseInt(e.target.value))}
                />
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.security.twoFactorAuth}
                    onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                  />
                  Enable Two-Factor Authentication
                </label>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h3>Notification Settings</h3>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                  />
                  Email Notifications
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notifications.pushNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                  />
                  Push Notifications
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notifications.maintenanceAlerts}
                    onChange={(e) => handleSettingChange('notifications', 'maintenanceAlerts', e.target.checked)}
                  />
                  Maintenance Alerts
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notifications.approvalAlerts}
                    onChange={(e) => handleSettingChange('notifications', 'approvalAlerts', e.target.checked)}
                  />
                  Approval Alerts
                </label>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="settings-section">
              <h3>Approval Settings</h3>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.approvals.autoApproveMaintenance}
                    onChange={(e) => handleSettingChange('approvals', 'autoApproveMaintenance', e.target.checked)}
                  />
                  Auto-approve Maintenance Requests Under ₹10,000
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.approvals.requireDualApproval}
                    onChange={(e) => handleSettingChange('approvals', 'requireDualApproval', e.target.checked)}
                  />
                  Require Dual Approval for Budget Requests
                </label>
              </div>

              <div className="setting-group">
                <label htmlFor="budgetLimit">Budget Approval Limit (₹)</label>
                <input
                  type="number"
                  id="budgetLimit"
                  value={settings.approvals.budgetLimit}
                  onChange={(e) => handleSettingChange('approvals', 'budgetLimit', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {activeTab === 'professions' && (
            <div className="settings-section">
              <div className="section-header">
                <h3>Profession Management</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreateForm(true)}
                >
                  Add New Profession
                </button>
              </div>

              {showCreateForm && (
                <div className="profession-form-modal">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h4>{editingProfession ? 'Edit Profession' : 'Create New Profession'}</h4>
                      <button
                        className="close-button"
                        onClick={resetProfessionForm}
                      >
                        ×
                      </button>
                    </div>
                    <form onSubmit={editingProfession ? handleUpdateProfession : handleCreateProfession}>
                      <div className="form-group">
                        <label htmlFor="professionName">Profession Name *</label>
                        <input
                          type="text"
                          id="professionName"
                          value={professionForm.name}
                          onChange={(e) => handleProfessionFormChange('name', e.target.value)}
                          placeholder="Enter profession name"
                          maxLength="100"
                          required
                        />
                      </div>

                      {editingProfession && (
                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={professionForm.is_active}
                              onChange={(e) => handleProfessionFormChange('is_active', e.target.checked)}
                            />
                            Active
                          </label>
                        </div>
                      )}

                      <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={resetProfessionForm}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          {editingProfession ? 'Update' : 'Create'} Profession
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {loadingProfessions ? (
                <div className="loading-spinner"></div>
              ) : (
                <div className="professions-table-container">
                  <table className="professions-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {professions.map(profession => (
                        <tr key={profession.id}>
                          <td>{profession.name}</td>
                          <td>
                            <span className={`type-badge ${profession.is_custom ? 'custom' : 'predefined'}`}>
                              {profession.is_custom ? 'Custom' : 'Predefined'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${profession.is_active ? 'active' : 'inactive'}`}>
                              {profession.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{new Date(profession.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleEditProfession(profession)}
                              >
                                Edit
                              </button>
                              <button
                                className={`btn btn-sm ${profession.is_active ? 'btn-warning' : 'btn-success'}`}
                                onClick={() => handleToggleStatus(profession)}
                              >
                                {profession.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              {profession.is_custom && (
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteProfession(profession)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {professions.length === 0 && (
                    <div className="no-professions">
                      <p>No professions found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="settings-section">
              <h3>System Maintenance</h3>

              <div className="maintenance-actions">
                <button className="btn btn-secondary">
                  Clear Cache
                </button>
                <button className="btn btn-secondary">
                  Backup Database
                </button>
                <button className="btn btn-danger">
                  Reset System
                </button>
              </div>

              <div className="system-info">
                <h4>System Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Version:</span>
                    <span className="info-value">1.0.0</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Backup:</span>
                    <span className="info-value">2024-01-15 14:30</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Database Size:</span>
                    <span className="info-value">245 MB</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Active Users:</span>
                    <span className="info-value">150</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;