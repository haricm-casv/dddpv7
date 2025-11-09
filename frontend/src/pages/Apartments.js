import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ApartmentManagementSelector from '../components/ApartmentManagementSelector';
import './Apartments.css';

const Apartments = () => {
  const { user } = useContext(AuthContext);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApartments, setSelectedApartments] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'manage'
  const [filters, setFilters] = useState({
    floor_number: '',
    unit_type: '',
    is_active: 'true',
    include_occupancy: 'true'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // New apartment form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newApartment, setNewApartment] = useState({
    floor_number: '',
    unit_type: '',
    unit_number: '',
    square_footage: '',
    building_name: ''
  });

  // Edit apartment form
  const [editingApartment, setEditingApartment] = useState(null);
  const [editForm, setEditForm] = useState({
    floor_number: '',
    unit_type: '',
    unit_number: '',
    square_footage: '',
    building_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchApartments();
  }, [filters, pagination.page]);

  const fetchApartments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      const response = await axios.get(`/api/v1/apartments?${queryParams}`);
      setApartments(response.data.data.apartments);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination.total,
        pages: response.data.data.pagination.pages
      }));
    } catch (error) {
      console.error('Error fetching apartments:', error);
      toast.error('Failed to load apartments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleCreateApartment = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/v1/apartments', newApartment);
      toast.success('Apartment created successfully');
      setShowCreateForm(false);
      setNewApartment({
        floor_number: '',
        unit_type: '',
        unit_number: '',
        square_footage: '',
        building_name: ''
      });
      fetchApartments();
    } catch (error) {
      console.error('Error creating apartment:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error.message);
      } else {
        toast.error('Failed to create apartment');
      }
    }
  };

  const handleEditApartment = (apartment) => {
    setEditingApartment(apartment);
    setEditForm({
      floor_number: apartment.floor_number,
      unit_type: apartment.unit_type,
      unit_number: apartment.unit_number,
      square_footage: apartment.square_footage || '',
      building_name: apartment.building_name || '',
      is_active: apartment.is_active
    });
  };

  const handleUpdateApartment = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.put(`/api/v1/apartments/${editingApartment.id}`, editForm);
      toast.success('Apartment updated successfully');
      setEditingApartment(null);
      fetchApartments();
    } catch (error) {
      console.error('Error updating apartment:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error.message);
      } else {
        toast.error('Failed to update apartment');
      }
    }
  };

  const handleDeleteApartment = async (apartmentId) => {
    if (!window.confirm('Are you sure you want to deactivate this apartment? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.put(`/api/v1/apartments/${apartmentId}`, { is_active: false });
      toast.success('Apartment deactivated successfully');
      fetchApartments();
    } catch (error) {
      console.error('Error deactivating apartment:', error);
      toast.error('Failed to deactivate apartment');
    }
  };

  const renderApartmentCard = (apartment) => {
    const totalOwnership = apartment.OwnershipRelationships?.reduce((sum, rel) => sum + rel.ownership_percentage, 0) || 0;
    const ownerCount = apartment.OwnershipRelationships?.length || 0;
    const tenantCount = apartment.TenantRelationships?.length || 0;

    return (
      <div key={apartment.id} className="apartment-card">
        <div className="apartment-header">
          <h3>{apartment.display_name}</h3>
          <div className="apartment-status">
            <span className={`status-badge ${apartment.is_active ? 'active' : 'inactive'}`}>
              {apartment.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="apartment-details">
          <div className="detail-row">
            <span className="label">Floor:</span>
            <span className="value">{apartment.floor_number}</span>
          </div>
          <div className="detail-row">
            <span className="label">Type:</span>
            <span className="value">{apartment.unit_type}</span>
          </div>
          <div className="detail-row">
            <span className="label">Unit:</span>
            <span className="value">{apartment.unit_number}</span>
          </div>
          {apartment.square_footage && (
            <div className="detail-row">
              <span className="label">Area:</span>
              <span className="value">{apartment.square_footage} sq ft</span>
            </div>
          )}
          {apartment.building_name && (
            <div className="detail-row">
              <span className="label">Building:</span>
              <span className="value">{apartment.building_name}</span>
            </div>
          )}
        </div>

        <div className="occupancy-summary">
          <h4>Occupancy</h4>
          <div className="occupancy-stats">
            <div className="stat">
              <span className="stat-label">Owners:</span>
              <span className="stat-value">{ownerCount}/2</span>
            </div>
            <div className="stat">
              <span className="stat-label">Tenants:</span>
              <span className="stat-value">{tenantCount}/2</span>
            </div>
            <div className="stat">
              <span className="stat-label">Ownership:</span>
              <span className="stat-value">{totalOwnership}%</span>
            </div>
          </div>
        </div>

        {apartment.OwnershipRelationships?.length > 0 && (
          <div className="occupants-list">
            <h5>Owners</h5>
            <ul>
              {apartment.OwnershipRelationships.map(rel => (
                <li key={rel.id}>
                  {rel.User?.full_name} ({rel.ownership_percentage}%)
                </li>
              ))}
            </ul>
          </div>
        )}

        {apartment.TenantRelationships?.length > 0 && (
          <div className="occupants-list">
            <h5>Tenants</h5>
            <ul>
              {apartment.TenantRelationships.map(rel => (
                <li key={rel.id}>
                  {rel.User?.full_name}
                  {rel.lease_end_date && (
                    <span className="lease-info">
                      (until {new Date(rel.lease_end_date).toLocaleDateString()})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="apartment-actions">
          <button
            onClick={() => handleEditApartment(apartment)}
            className="btn btn-secondary btn-sm"
          >
            Edit
          </button>
          {apartment.is_active && (
            <button
              onClick={() => handleDeleteApartment(apartment.id)}
              className="btn btn-danger btn-sm"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderApartmentTable = () => (
    <div className="apartments-table-container">
      <table className="apartments-table">
        <thead>
          <tr>
            <th>Apartment</th>
            <th>Floor</th>
            <th>Type</th>
            <th>Unit</th>
            <th>Area</th>
            <th>Owners</th>
            <th>Tenants</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {apartments.map(apartment => {
            const ownerCount = apartment.OwnershipRelationships?.length || 0;
            const tenantCount = apartment.TenantRelationships?.length || 0;

            return (
              <tr key={apartment.id}>
                <td>{apartment.display_name}</td>
                <td>{apartment.floor_number}</td>
                <td>{apartment.unit_type}</td>
                <td>{apartment.unit_number}</td>
                <td>{apartment.square_footage ? `${apartment.square_footage} sq ft` : '-'}</td>
                <td>{ownerCount}/2</td>
                <td>{tenantCount}/2</td>
                <td>
                  <span className={`status-badge ${apartment.is_active ? 'active' : 'inactive'}`}>
                    {apartment.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      onClick={() => handleEditApartment(apartment)}
                      className="btn btn-secondary btn-xs"
                    >
                      Edit
                    </button>
                    {apartment.is_active && (
                      <button
                        onClick={() => handleDeleteApartment(apartment.id)}
                        className="btn btn-danger btn-xs"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="apartments-page">
      <div className="page-header">
        <h1>Apartment Management</h1>
        <div className="header-actions">
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            Add Apartment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Floor:</label>
            <select
              value={filters.floor_number}
              onChange={(e) => handleFilterChange('floor_number', e.target.value)}
            >
              <option value="">All Floors</option>
              {[...Array(20)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Type:</label>
            <input
              type="text"
              value={filters.unit_type}
              onChange={(e) => handleFilterChange('unit_type', e.target.value)}
              placeholder="Unit type"
            />
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.is_active}
              onChange={(e) => handleFilterChange('is_active', e.target.value)}
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            className={`view-btn ${viewMode === 'manage' ? 'active' : ''}`}
            onClick={() => setViewMode('manage')}
          >
            Manage
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'manage' ? (
        <ApartmentManagementSelector
          relationshipType="all"
          selectedApartments={selectedApartments}
          onApartmentsSelect={setSelectedApartments}
          maxSelections={50}
          showOccupancy={true}
          allowMultiple={true}
        />
      ) : (
        <>
          {loading ? (
            <div className="loading-spinner">Loading apartments...</div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="apartments-grid">
                  {apartments.map(renderApartmentCard)}
                </div>
              ) : (
                renderApartmentTable()
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>

                  <span className="page-info">
                    Page {pagination.page} of {pagination.pages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="btn btn-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create Apartment Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Apartment</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateApartment} className="apartment-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Floor Number *</label>
                  <input
                    type="number"
                    value={newApartment.floor_number}
                    onChange={(e) => setNewApartment(prev => ({
                      ...prev,
                      floor_number: e.target.value
                    }))}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit Type *</label>
                  <input
                    type="text"
                    value={newApartment.unit_type}
                    onChange={(e) => setNewApartment(prev => ({
                      ...prev,
                      unit_type: e.target.value
                    }))}
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit Number *</label>
                  <input
                    type="text"
                    value={newApartment.unit_number}
                    onChange={(e) => setNewApartment(prev => ({
                      ...prev,
                      unit_number: e.target.value
                    }))}
                    maxLength="10"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Square Footage</label>
                  <input
                    type="number"
                    value={newApartment.square_footage}
                    onChange={(e) => setNewApartment(prev => ({
                      ...prev,
                      square_footage: e.target.value
                    }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Building Name</label>
                <input
                  type="text"
                  value={newApartment.building_name}
                  onChange={(e) => setNewApartment(prev => ({
                    ...prev,
                    building_name: e.target.value
                  }))}
                  maxLength="100"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Apartment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Apartment Modal */}
      {editingApartment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Apartment</h2>
              <button
                onClick={() => setEditingApartment(null)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateApartment} className="apartment-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Floor Number *</label>
                  <input
                    type="number"
                    value={editForm.floor_number}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      floor_number: e.target.value
                    }))}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit Type *</label>
                  <input
                    type="text"
                    value={editForm.unit_type}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      unit_type: e.target.value
                    }))}
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit Number *</label>
                  <input
                    type="text"
                    value={editForm.unit_number}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      unit_number: e.target.value
                    }))}
                    maxLength="10"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Square Footage</label>
                  <input
                    type="number"
                    value={editForm.square_footage}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      square_footage: e.target.value
                    }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Building Name</label>
                <input
                  type="text"
                  value={editForm.building_name}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    building_name: e.target.value
                  }))}
                  maxLength="100"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      is_active: e.target.checked
                    }))}
                  />
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setEditingApartment(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Apartment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Apartments;