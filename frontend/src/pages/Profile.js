import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user: authUser, updateUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [professions, setProfessions] = useState([]);
  const [loadingProfessions, setLoadingProfessions] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  const [formData, setFormData] = useState({
    // Personal Information
    full_name: '',
    email: '',
    mobile_number: '',

    // Profession
    profession_id: '',
    custom_profession: '',
    show_custom_profession: false,

    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_number: '',

    // Additional
    alternate_contact: '',
    vehicle_info: '',
    profile_photo_url: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    if (authUser) {
      loadUserProfile();
      fetchProfessions();
    }
  }, [authUser]);

  const loadUserProfile = async () => {
    try {
      const response = await axios.get('/api/v1/auth/me');
      const userData = response.data.data.user;

      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        mobile_number: userData.mobile_number || '',
        profession_id: userData.profession_id || '',
        custom_profession: '',
        show_custom_profession: false,
        emergency_contact_name: userData.emergency_contact_name || '',
        emergency_contact_number: userData.emergency_contact_number || '',
        alternate_contact: userData.alternate_contact || '',
        vehicle_info: userData.vehicle_info || '',
        profile_photo_url: userData.profile_photo_url || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  const fetchProfessions = async () => {
    try {
      const response = await axios.get('/api/v1/professions');
      setProfessions(response.data.data.professions);
    } catch (error) {
      console.error('Error fetching professions:', error);
      toast.error('Failed to load professions');
    } finally {
      setLoadingProfessions(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Handle profession selection
    if (name === 'profession_id') {
      const selectedProfession = professions.predefined?.find(p => p.id.toString() === value);
      const showCustom = selectedProfession?.name === 'Other';
      setFormData(prev => ({
        ...prev,
        show_custom_profession: showCustom,
        custom_profession: showCustom ? prev.custom_profession : ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfileForm = () => {
    const newErrors = {};

    // Personal Information
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.mobile_number.trim()) {
      newErrors.mobile_number = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Please enter a valid 10-digit mobile number';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Profession
    if (!formData.profession_id && !formData.custom_profession.trim()) {
      newErrors.profession = 'Please select or enter a profession';
    }

    if (formData.show_custom_profession && !formData.custom_profession.trim()) {
      newErrors.custom_profession = 'Custom profession is required';
    }

    // Emergency Contact
    if (formData.emergency_contact_name && !formData.emergency_contact_number) {
      newErrors.emergency_contact_number = 'Emergency contact number is required when name is provided';
    }

    if (formData.emergency_contact_number && !formData.emergency_contact_name) {
      newErrors.emergency_contact_name = 'Emergency contact name is required when number is provided';
    }

    if (formData.emergency_contact_number && !/^[6-9]\d{9}$/.test(formData.emergency_contact_number)) {
      newErrors.emergency_contact_number = 'Please enter a valid 10-digit emergency contact number';
    }

    // Additional validation
    if (formData.alternate_contact && !/^[6-9]\d{9}$/.test(formData.alternate_contact)) {
      newErrors.alternate_contact = 'Please enter a valid 10-digit alternate contact number';
    }

    if (formData.vehicle_info && formData.vehicle_info.length > 1000) {
      newErrors.vehicle_info = 'Vehicle info must not exceed 1000 characters';
    }

    if (formData.profile_photo_url && !/^https?:\/\/.+/.test(formData.profile_photo_url)) {
      newErrors.profile_photo_url = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.current_password) {
      newErrors.current_password = 'Current password is required';
    }

    if (!passwordData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'New password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(passwordData.new_password)) {
      newErrors.new_password = 'New password must contain uppercase, lowercase, number, and special character';
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    if (passwordData.current_password === passwordData.new_password) {
      newErrors.new_password = 'New password must be different from current password';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (!validateProfileForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || undefined,
        mobile_number: formData.mobile_number.trim(),
        profession_id: formData.show_custom_profession ? undefined : (formData.profession_id ? parseInt(formData.profession_id) : undefined),
        custom_profession: formData.custom_profession.trim() || undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_number: formData.emergency_contact_number.trim() || undefined,
        alternate_contact: formData.alternate_contact.trim() || undefined,
        vehicle_info: formData.vehicle_info.trim() || undefined,
        profile_photo_url: formData.profile_photo_url.trim() || undefined
      };

      const response = await axios.put(`/api/v1/users/${authUser.id}`, submitData);

      // Update auth context
      updateUser(response.data.data.user);

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);

      if (error.response?.data?.error) {
        const { code, message, details } = error.response.data.error;

        switch (code) {
          case 'VALIDATION_ERROR':
            if (details) {
              const validationErrors = {};
              details.forEach(detail => {
                validationErrors[detail.param] = detail.msg;
              });
              setErrors(validationErrors);
            }
            toast.error('Please correct the form errors');
            break;
          case 'EMAIL_EXISTS':
            toast.error('Email address is already in use');
            setErrors({ email: 'Email address is already in use' });
            break;
          case 'MOBILE_EXISTS':
            toast.error('Mobile number is already in use');
            setErrors({ mobile_number: 'Mobile number is already in use' });
            break;
          default:
            toast.error(message || 'Profile update failed');
        }
      } else {
        toast.error('Profile update failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      toast.error('Please correct the password form errors');
      return;
    }

    setLoading(true);

    try {
      await axios.put(`/api/v1/users/${authUser.id}/password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });

      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Password change error:', error);

      if (error.response?.data?.error) {
        const { code, message } = error.response.data.error;

        switch (code) {
          case 'INVALID_CURRENT_PASSWORD':
            setPasswordErrors({ current_password: 'Current password is incorrect' });
            toast.error('Current password is incorrect');
            break;
          case 'VALIDATION_ERROR':
            toast.error('Please check password requirements');
            break;
          default:
            toast.error(message || 'Password change failed');
        }
      } else {
        toast.error('Password change failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!authUser.email) {
      toast.error('No email address associated with your account');
      return;
    }

    if (authUser.email_verified) {
      toast.error('Your email is already verified');
      return;
    }

    try {
      await axios.post('/api/v1/auth/send-verification');
      toast.success('Verification code sent to your email');
    } catch (error) {
      console.error('Send verification error:', error);
      toast.error('Failed to send verification code');
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information and preferences</p>
      </div>

      <div className="profile-container">
        {/* Profile Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal Information
          </button>
          <button
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
          <button
            className={`tab-button ${activeTab === 'relationships' ? 'active' : ''}`}
            onClick={() => setActiveTab('relationships')}
          >
            Relationships
          </button>
        </div>

        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-section">
              <h2>Personal Information</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="full_name">Full Name *</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className={errors.full_name ? 'error' : ''}
                    placeholder="Enter your full name"
                  />
                  {errors.full_name && <span className="error-message">{errors.full_name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="mobile_number">Mobile Number *</label>
                  <div className="input-with-status">
                    <input
                      type="tel"
                      id="mobile_number"
                      name="mobile_number"
                      value={formData.mobile_number}
                      onChange={handleInputChange}
                      className={errors.mobile_number ? 'error' : ''}
                      placeholder="10-digit mobile number"
                      maxLength="10"
                    />
                    {authUser?.mobile_verified && (
                      <span className="verification-badge verified">✓ Verified</span>
                    )}
                  </div>
                  {errors.mobile_number && <span className="error-message">{errors.mobile_number}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-status">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="your.email@example.com"
                  />
                  {authUser?.email_verified ? (
                    <span className="verification-badge verified">✓ Verified</span>
                  ) : authUser?.email ? (
                    <button
                      type="button"
                      className="verify-button"
                      onClick={handleSendVerification}
                    >
                      Verify Email
                    </button>
                  ) : null}
                </div>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
            </div>

            <div className="form-section">
              <h2>Profession</h2>

              <div className="form-group">
                <label htmlFor="profession_id">Profession *</label>
                {loadingProfessions ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <select
                    id="profession_id"
                    name="profession_id"
                    value={formData.profession_id}
                    onChange={handleInputChange}
                    className={errors.profession ? 'error' : ''}
                  >
                    <option value="">Select your profession</option>
                    {professions.predefined?.map(profession => (
                      <option key={profession.id} value={profession.id}>
                        {profession.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.profession && <span className="error-message">{errors.profession}</span>}
              </div>

              {formData.show_custom_profession && (
                <div className="form-group">
                  <label htmlFor="custom_profession">Specify Your Profession *</label>
                  <input
                    type="text"
                    id="custom_profession"
                    name="custom_profession"
                    value={formData.custom_profession}
                    onChange={handleInputChange}
                    className={errors.custom_profession ? 'error' : ''}
                    placeholder="Enter your profession"
                    maxLength="100"
                  />
                  {errors.custom_profession && <span className="error-message">{errors.custom_profession}</span>}
                </div>
              )}
            </div>

            <div className="form-section">
              <h2>Emergency Contact</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emergency_contact_name">Emergency Contact Name</label>
                  <input
                    type="text"
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                    className={errors.emergency_contact_name ? 'error' : ''}
                    placeholder="Contact person's name"
                  />
                  {errors.emergency_contact_name && <span className="error-message">{errors.emergency_contact_name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="emergency_contact_number">Emergency Contact Number</label>
                  <input
                    type="tel"
                    id="emergency_contact_number"
                    name="emergency_contact_number"
                    value={formData.emergency_contact_number}
                    onChange={handleInputChange}
                    className={errors.emergency_contact_number ? 'error' : ''}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                  />
                  {errors.emergency_contact_number && <span className="error-message">{errors.emergency_contact_number}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Additional Information</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="alternate_contact">Alternate Contact Number</label>
                  <input
                    type="tel"
                    id="alternate_contact"
                    name="alternate_contact"
                    value={formData.alternate_contact}
                    onChange={handleInputChange}
                    className={errors.alternate_contact ? 'error' : ''}
                    placeholder="Another contact number"
                    maxLength="10"
                  />
                  {errors.alternate_contact && <span className="error-message">{errors.alternate_contact}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="profile_photo_url">Profile Photo URL</label>
                  <input
                    type="url"
                    id="profile_photo_url"
                    name="profile_photo_url"
                    value={formData.profile_photo_url}
                    onChange={handleInputChange}
                    className={errors.profile_photo_url ? 'error' : ''}
                    placeholder="https://example.com/photo.jpg"
                  />
                  {errors.profile_photo_url && <span className="error-message">{errors.profile_photo_url}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="vehicle_info">Vehicle Information</label>
                <textarea
                  id="vehicle_info"
                  name="vehicle_info"
                  value={formData.vehicle_info}
                  onChange={handleInputChange}
                  className={errors.vehicle_info ? 'error' : ''}
                  placeholder="Enter details about your vehicles (make, model, registration number, etc.)"
                  rows="3"
                  maxLength="1000"
                />
                {errors.vehicle_info && <span className="error-message">{errors.vehicle_info}</span>}
                <small className="form-help">{formData.vehicle_info.length}/1000 characters</small>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="form-section">
              <h2>Change Password</h2>

              <div className="form-group">
                <label htmlFor="current_password">Current Password *</label>
                <input
                  type="password"
                  id="current_password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  className={passwordErrors.current_password ? 'error' : ''}
                  placeholder="Enter your current password"
                />
                {passwordErrors.current_password && <span className="error-message">{passwordErrors.current_password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="new_password">New Password *</label>
                <input
                  type="password"
                  id="new_password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  className={passwordErrors.new_password ? 'error' : ''}
                  placeholder="Enter a new strong password"
                />
                {passwordErrors.new_password && <span className="error-message">{passwordErrors.new_password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm New Password *</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  className={passwordErrors.confirm_password ? 'error' : ''}
                  placeholder="Confirm your new password"
                />
                {passwordErrors.confirm_password && <span className="error-message">{passwordErrors.confirm_password}</span>}
              </div>

              <div className="password-requirements">
                <h4>Password Requirements:</h4>
                <ul>
                  <li>At least 8 characters long</li>
                  <li>Contains at least one uppercase letter</li>
                  <li>Contains at least one lowercase letter</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character (@$!%*?&)</li>
                </ul>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}

        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div className="relationships-section">
            <div className="form-section">
              <h2>My Relationships</h2>

              {/* This would show ownership and tenancy relationships */}
              <div className="relationships-placeholder">
                <p>Relationship management features will be displayed here.</p>
                <p>This includes ownership percentages, lease periods, and approval status.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;