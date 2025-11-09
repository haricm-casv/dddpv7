import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './ApartmentSelector.css';

const ApartmentSelector = ({
  relationshipType = 'all', // 'owner', 'tenant', or 'all'
  selectedApartment,
  onApartmentSelect,
  disabled = false,
  showOccupancy = true
}) => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) {
    return (
      <div className="apartment-selector">
        <div className="loading-spinner">Loading apartments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="apartment-selector">
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
    <div className="apartment-selector">
      <h3>Select Apartment</h3>
      <div className="apartments-grid">
        {apartments.map((apartment) => {
          const occupancyStatus = getOccupancyStatus(apartment);
          const isAvailable = isApartmentAvailable(apartment);
          const isSelected = selectedApartment?.id === apartment.id;

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
              onClick={() => {
                if (!disabled && isAvailable) {
                  onApartmentSelect(apartment);
                }
              }}
            >
              <div className="apartment-header">
                <h4>{apartment.display_name}</h4>
                <span className={`status-badge ${occupancyStatus.status}`}>
                  {occupancyStatus.text}
                </span>
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

      {apartments.length === 0 && (
        <div className="no-apartments">
          <p>No apartments available for the selected relationship type.</p>
        </div>
      )}
    </div>
  );
};

export default ApartmentSelector;