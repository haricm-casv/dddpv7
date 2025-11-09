import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import ApartmentSelector from '../components/ApartmentSelector';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [loadingApartments, setLoadingApartments] = useState(true);
  const [loadingProfessions, setLoadingProfessions] = useState(true);

  const [formData, setFormData] = useState({
    // Personal Information
    full_name: '',
    email: '',
    mobile_number: '',
    password: '',
    confirm_password: '',

    // Profession
    profession_id: '',
    custom_profession: '',
    show_custom_profession: false,

    // Apartment Association
    selectedApartment: null,
    relationship_type: '',

    // Ownership specific
    ownership_percentage: '',

    // Tenant specific
    lease_start_date: '',
    lease_end_date: '',

    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_number: '',

    // Additional
    alternate_contact: '',
    vehicle_info: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchApartments();
    fetchProfessions();
  }, []);

  const fetchApartments = async () => {
    try {
      const response = await axios.get('/api/v1/apartments/available');
      setApartments(response.data.data.apartments);
    } catch (error) {
      console.error('Error fetching apartments:', error);
      toast.error('Failed to load apartments');
    } finally {
      setLoadingApartments(false);
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

    // Handle relationship type change
    if (name === 'relationship_type') {
      setFormData(prev => ({
        ...prev,
        selectedApartment: null,
        ownership_percentage: value === 'owner' ? '100' : '',
        lease_start_date: '',
        lease_end_date: ''
      }));
    }
  };

  const validateForm = () => {
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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    // Profession
    if (!formData.profession_id && !formData.custom_profession.trim()) {
      newErrors.profession = 'Please select or enter a profession';
    }

    if (formData.show_custom_profession && !formData.custom_profession.trim()) {
      newErrors.custom_profession = 'Custom profession is required';
    }

    // Apartment Association
    if (!formData.selectedApartment) {
      newErrors.selectedApartment = 'Please select an apartment';
    }

    if (!formData.relationship_type) {
      newErrors.relationship_type = 'Please select your relationship type';
    }

    // Ownership specific validation
    if (formData.relationship_type === 'owner') {
      const percentage = parseFloat(formData.ownership_percentage);
      if (!formData.ownership_percentage || isNaN(percentage) || percentage <= 0 || percentage > 100) {
        newErrors.ownership_percentage = 'Please enter a valid ownership percentage (1-100%)';
      }
    }

    // Tenant specific validation
    if (formData.relationship_type === 'tenant') {
      if (!formData.lease_start_date) {
        newErrors.lease_start_date = 'Lease start date is required';
      }

      if (!formData.lease_end_date) {
        newErrors.lease_end_date = 'Lease end date is required';
      }

      if (formData.lease_start_date && formData.lease_end_date) {
        const startDate = new Date(formData.lease_start_date);
        const endDate = new Date(formData.lease_end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
          newErrors.lease_start_date = 'Lease start date cannot be in the past';
        }

        if (endDate <= startDate) {
          newErrors.lease_end_date = 'Lease end date must be after start date';
        }
      }
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || undefined,
        mobile_number: formData.mobile_number.trim(),
        password: formData.password,
        profession_id: formData.show_custom_profession ? undefined : parseInt(formData.profession_id),
        custom_profession: formData.custom_profession.trim() || undefined,
        apartment_id: formData.selectedApartment.id,
        relationship_type: formData.relationship_type,
        ownership_percentage: formData.relationship_type === 'owner' ? parseFloat(formData.ownership_percentage) : undefined,
        lease_start_date: formData.relationship_type === 'tenant' ? formData.lease_start_date : undefined,
        lease_end_date: formData.relationship_type === 'tenant' ? formData.lease_end_date : undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_number: formData.emergency_contact_number.trim() || undefined,
        alternate_contact: formData.alternate_contact.trim() || undefined,
        vehicle_info: formData.vehicle_info.trim() || undefined
      };

      const response = await axios.post('/api/v1/auth/register', submitData);

      toast.success('Registration successful! Please check your email for verification.');

      // Redirect to login or email verification page
      navigate('/login', {
        state: {
          message: 'Registration successful! Please verify your email before logging in.',
          email: formData.email
        }
      });

    } catch (error) {
      console.error('Registration error:', error);

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
          case 'USER_EXISTS':
            toast.error('A user with this email or mobile number already exists');
            break;
          case 'INVALID_APARTMENT':
            toast.error('Selected apartment is not available');
            setErrors({ selectedApartment: 'Selected apartment is not available' });
            break;
          default:
            toast.error(message || 'Registration failed');
        }
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Join DD Diamond Park</h1>
          <p>Create your account to access apartment management services</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {/* Personal Information Section */}
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
                {errors.mobile_number && <span className="error-message">{errors.mobile_number}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email (Optional)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
                placeholder="your.email@example.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? 'error' : ''}
                  placeholder="Create a strong password"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm Password *</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  className={errors.confirm_password ? 'error' : ''}
                  placeholder="Confirm your password"
                />
                {errors.confirm_password && <span className="error-message">{errors.confirm_password}</span>}
              </div>
            </div>
          </div>

          {/* Profession Section */}
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

          {/* Apartment Association Section */}
          <div className="form-section">
            <h2>Apartment Association</h2>

            <div className="form-group">
              <label htmlFor="relationship_type">Relationship Type *</label>
              <select
                id="relationship_type"
                name="relationship_type"
                value={formData.relationship_type}
                onChange={handleInputChange}
                className={errors.relationship_type ? 'error' : ''}
              >
                <option value="">Select relationship type</option>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </select>
              {errors.relationship_type && <span className="error-message">{errors.relationship_type}</span>}
            </div>

            {formData.relationship_type && (
              <div className="form-group">
                <label>Apartment Selection *</label>
                <ApartmentSelector
                  relationshipType={formData.relationship_type}
                  selectedApartment={formData.selectedApartment}
                  onApartmentSelect={(apartment) => {
                    setFormData(prev => ({
                      ...prev,
                      selectedApartment: apartment
                    }));
                    // Clear error when apartment is selected
                    if (errors.selectedApartment) {
                      setErrors(prev => ({
                        ...prev,
                        selectedApartment: ''
                      }));
                    }
                  }}
                  disabled={false}
                  showOccupancy={true}
                />
                {errors.selectedApartment && <span className="error-message">{errors.selectedApartment}</span>}
              </div>
            )}

            {formData.relationship_type === 'owner' && (
              <div className="form-group">
                <label htmlFor="ownership_percentage">Ownership Percentage *</label>
                <input
                  type="number"
                  id="ownership_percentage"
                  name="ownership_percentage"
                  value={formData.ownership_percentage}
                  onChange={handleInputChange}
                  className={errors.ownership_percentage ? 'error' : ''}
                  placeholder="100"
                  min="0"
                  max="100"
                  step="0.01"
                />
                {errors.ownership_percentage && <span className="error-message">{errors.ownership_percentage}</span>}
              </div>
            )}

            {formData.relationship_type === 'tenant' && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lease_start_date">Lease Start Date *</label>
                  <input
                    type="date"
                    id="lease_start_date"
                    name="lease_start_date"
                    value={formData.lease_start_date}
                    onChange={handleInputChange}
                    className={errors.lease_start_date ? 'error' : ''}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.lease_start_date && <span className="error-message">{errors.lease_start_date}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="lease_end_date">Lease End Date *</label>
                  <input
                    type="date"
                    id="lease_end_date"
                    name="lease_end_date"
                    value={formData.lease_end_date}
                    onChange={handleInputChange}
                    className={errors.lease_end_date ? 'error' : ''}
                    min={formData.lease_start_date || new Date().toISOString().split('T')[0]}
                  />
                  {errors.lease_end_date && <span className="error-message">{errors.lease_end_date}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact Section */}
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

          {/* Additional Information Section */}
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

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={loading || loadingApartments || loadingProfessions}
            >
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </div>

          {/* Login Link */}
          <div className="form-footer">
            <p>Already have an account? <Link to="/login">Sign in here</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;