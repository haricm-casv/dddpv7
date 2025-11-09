import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './ApartmentManagementSelector.css';

const ApartmentManagementSelector = ({
  relationshipType = 'all', // 'owner', 'tenant', or 'all'
  selectedApartments = [],
  onApartmentsSelect,
  maxSelections = 10,
  disabled = false,
  showOccupancy = true,
  allowMultiple = true
}) => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchApartments();
  }, [relationshipType]);

  const fetchApartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/apartments/available?relationship_type=${relationshipType}`);
      const data = await response.json();

      if (data.success) {
        setApartments(data.data.apartments);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch apartments');
      }
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load apartments');
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyStatus = (apartment) => {
    const { occupancy } = apartment;
    const totalOwners = occupancy.owners.length;
    const totalTenants = occupancy.tenants.length;

    if (relationshipType === 'owner') {
      const totalOwnership = occupancy.owners.reduce((sum, owner) => sum + owner.percentage, 0);
      if (totalOwnership >= 100) return { status: 'full', text: 'Fully Owned' };
      if (totalOwners >= 2) return { status: 'full', text: 'Max Owners' };
      return { status: 'available', text: `${totalOwners}/2 Owners` };
    } else if (relationshipType === 'tenant') {
      if (totalTenants >= 2) return { status: 'full', text: 'Max Tenants' };
      return { status: 'available', text: `${totalTenants}/2 Tenants` };
    } else {
      return {
        status: 'info',
        text: `${totalOwners} owners, ${totalTenants} tenants`
      };
    }
  };

  const isApartmentAvailable = (apartment) => {
    if (relationshipType === 'all') return true;

    const { occupancy } = apartment;
    const totalOwners = occupancy.owners.length;
    const totalTenants = occupancy.tenants.length;

    if (relationshipType === 'owner') {
      const totalOwnership = occupancy.owners.reduce((sum, owner) => sum + owner.percentage, 0);
      return totalOwnership < 100 && totalOwners < 2;
    } else if (relationshipType === 'tenant') {
      return totalTenants < 2;
    }

    return true;
  };

  const isApartmentSelected = (apartment) => {
    return selectedApartments.some(selected => selected.id === apartment.id);
  };

  const handleApartmentToggle = (apartment) => {
    if (disabled) return;

    const isSelected = isApartmentSelected(apartment);

    if (isSelected) {
      // Remove from selection
      const newSelection = selectedApartments.filter(selected => selected.id !== apartment.id);
      onApartmentsSelect(newSelection);
    } else {
      // Add to selection
      if (!allowMultiple && selectedApartments.length >= 1) {
        toast.warning('Only one apartment can be selected');
        return;
      }

      if (selectedApartments.length >= maxSelections) {
        toast.warning(`Maximum ${maxSelections} apartments can be selected`);
        return;
      }

      const newSelection = [...selectedApartments, apartment];
      onApartmentsSelect(newSelection);
    }
  };

  const filteredApartments = apartments.filter(apartment => {
    const matchesSearch = searchTerm === '' ||
      apartment.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.unit_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFloor = filterFloor === '' || apartment.floor_number.toString() === filterFloor;
    const matchesType = filterType === '' || apartment.unit_type === filterType;

    return matchesSearch && matchesFloor && matchesType;
  });

  const uniqueFloors = [...new Set(apartments.map(apt => apt.floor_number))].sort((a, b) => a - b);
  const uniqueTypes = [...new Set(apartments.map(apt => apt.unit_type))].sort();

  if (loading) {
    return (
      <div className="apartment-management-selector">
        <div className="loading-spinner">Loading apartments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="apartment-management-selector">
        <div className="error-message">
          <p>Error loading apartments: {error}</p>
          <button onClick={fetchApartments} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="apartment-management-selector">
      <div className="selector-header">
        <h3>Select Apartments</h3>
        {selectedApartments.length > 0 && (
          <div className="selection-count">
            {selectedApartments.length} of {maxSelections} selected
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search apartments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            className="filter-select"
          >
            <option value="">All Floors</option>
            {uniqueFloors.map(floor => (
              <option key={floor} value={floor}>Floor {floor}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Apartments Summary */}
      {selectedApartments.length > 0 && (
        <div className="selected-summary">
          <h4>Selected Apartments:</h4>
          <div className="selected-list">
            {selectedApartments.map(apartment => (
              <div key={apartment.id} className="selected-item">
                <span>{apartment.display_name}</span>
                <button
                  onClick={() => handleApartmentToggle(apartment)}
                  className="remove-btn"
                  disabled={disabled}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apartments Grid */}
      <div className="apartments-grid">
        {filteredApartments.map((apartment) => {
          const occupancyStatus = getOccupancyStatus(apartment);
          const isAvailable = isApartmentAvailable(apartment);
          const isSelected = isApartmentSelected(apartment);

          return (
            <div
              key={apartment.id}
              className={`apartment-card ${
                isSelected ? 'selected' : ''
              } ${
                !isAvailable ? 'unavailable' : 'available'
              } ${
                disabled ? 'disabled' : ''
              }`}
              onClick={() => handleApartmentToggle(apartment)}
            >
              <div className="apartment-header">
                <h4>{apartment.display_name}</h4>
                <div className="card-actions">
                  <span className={`status-badge ${occupancyStatus.status}`}>
                    {occupancyStatus.text}
                  </span>
                  {allowMultiple && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by onClick
                      className="selection-checkbox"
                    />
                  )}
                </div>
              </div>

              <div className="apartment-details">
                <p><strong>Floor:</strong> {apartment.floor_number}</p>
                <p><strong>Type:</strong> {apartment.unit_type}</p>
                <p><strong>Unit:</strong> {apartment.unit_number}</p>
                {apartment.square_footage && (
                  <p><strong>Area:</strong> {apartment.square_footage} sq ft</p>
                )}
              </div>

              {showOccupancy && (
                <div className="occupancy-info">
                  <h5>Current Occupancy:</h5>
                  {apartment.occupancy.owners.length > 0 && (
                    <div className="owners-list">
                      <strong>Owners:</strong>
                      <ul>
                        {apartment.occupancy.owners.map((owner, index) => (
                          <li key={index}>
                            {owner.name} ({owner.percentage}%)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {apartment.occupancy.tenants.length > 0 && (
                    <div className="tenants-list">
                      <strong>Tenants:</strong>
                      <ul>
                        {apartment.occupancy.tenants.map((tenant, index) => (
                          <li key={index}>
                            {tenant.name}
                            {tenant.lease_end && (
                              <span className="lease-info">
                                (until {new Date(tenant.lease_end).toLocaleDateString()})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {apartment.occupancy.owners.length === 0 && apartment.occupancy.tenants.length === 0 && (
                    <p className="no-occupancy">No current occupants</p>
                  )}
                </div>
              )}

              {isSelected && (
                <div className="selection-indicator">
                  ✓ Selected
                </div>
              )}

              {!isAvailable && (
                <div className="unavailable-overlay">
                  Not Available
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredApartments.length === 0 && (
        <div className="no-apartments">
          <p>No apartments match your current filters.</p>
          {(searchTerm || filterFloor || filterType) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterFloor('');
                setFilterType('');
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ApartmentManagementSelector;