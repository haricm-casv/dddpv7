import React, { useState, useEffect } from 'react';
import './Approvals.css';

const Approvals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/approvals/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Transform API data to match component expectations
          const transformedApprovals = result.data.approvals.map(approval => ({
            id: approval.id,
            type: approval.type,
            title: approval.type === 'user_registration'
              ? `New User Registration - ${approval.user.full_name}`
              : approval.type === 'ownership_transfer'
              ? `Ownership Transfer - ${approval.apartment ? `${approval.apartment.floor_number} ${approval.apartment.unit_type}` : 'Unknown Apartment'}`
              : `Approval Request #${approval.id}`,
            description: approval.type === 'user_registration'
              ? `Registration request from ${approval.user.full_name} (${approval.user.profession || 'No profession specified'})`
              : approval.type === 'ownership_transfer'
              ? `Transfer ${approval.ownership_percentage}% ownership from ${approval.transferor?.full_name || 'Unknown'} to ${approval.transferee?.full_name || 'Unknown'}`
              : `Approval request details`,
            status: approval.approval_status,
            submittedBy: approval.type === 'user_registration'
              ? approval.user.full_name
              : approval.type === 'ownership_transfer'
              ? approval.transferor?.full_name || 'Unknown'
              : 'System',
            submittedDate: new Date(approval.created_at).toLocaleDateString(),
            priority: 'medium', // Default priority, could be enhanced
            apartment: approval.apartment ? `${approval.apartment.floor_number} ${approval.apartment.unit_type}` : null,
            user: approval.user,
            transferor: approval.transferor,
            transferee: approval.transferee,
            canApprove: approval.can_approve,
            canOverride: approval.can_override,
            instantApproval: approval.instant_approval
          }));
          setApprovals(transformedApprovals);
        }
      } else {
        console.error('Failed to fetch approvals:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovals = approvals.filter(approval => {
    if (filter === 'all') return true;
    return approval.status === filter;
  });

  const handleApprove = async (approval) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/approvals/${approval.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_type: approval.type,
          comments: 'Approved via dashboard'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state
          setApprovals(prev =>
            prev.map(a =>
              a.id === approval.id
                ? { ...a, status: 'approved' }
                : a
            )
          );
          alert('Request approved successfully');
        }
      } else {
        const error = await response.json();
        alert(`Approval failed: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve request');
    }
  };

  const handleReject = async (approval) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/approvals/${approval.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_type: approval.type,
          comments: reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state
          setApprovals(prev =>
            prev.map(a =>
              a.id === approval.id
                ? { ...a, status: 'rejected', rejectionReason: reason }
                : a
            )
          );
          alert('Request rejected successfully');
        }
      } else {
        const error = await response.json();
        alert(`Rejection failed: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Failed to reject request');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f39c12',
      approved: '#27ae60',
      rejected: '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#e74c3c',
      medium: '#f39c12',
      low: '#27ae60'
    };
    return colors[priority] || '#95a5a6';
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div className="approvals-page">
      <div className="page-header">
        <h1>Approval Workflows</h1>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({approvals.length})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({approvals.filter(a => a.status === 'pending').length})
          </button>
          <button
            className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved ({approvals.filter(a => a.status === 'approved').length})
          </button>
          <button
            className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({approvals.filter(a => a.status === 'rejected').length})
          </button>
        </div>
      </div>

      <div className="approvals-list">
        {filteredApprovals.map(approval => (
          <div key={approval.id} className="approval-card">
            <div className="approval-header">
              <div className="approval-title-section">
                <h3>{approval.title}</h3>
                <div className="approval-meta">
                  <span className="submitted-by">Submitted by: {approval.submittedBy}</span>
                  <span className="submitted-date">{approval.submittedDate}</span>
                  <span
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(approval.priority) }}
                  >
                    {approval.priority}
                  </span>
                </div>
              </div>
              <div className="approval-status">
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(approval.status) }}
                >
                  {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="approval-body">
              <p className="approval-description">{approval.description}</p>

              {approval.amount && (
                <div className="approval-amount">
                  <strong>Amount: ₹{approval.amount.toLocaleString()}</strong>
                </div>
              )}

              {approval.apartment && (
                <div className="approval-apartment">
                  <strong>Apartment: {approval.apartment}</strong>
                </div>
              )}

              {approval.status === 'approved' && (
                <div className="approval-details">
                  <p><strong>Approved by:</strong> {approval.approvedBy}</p>
                  <p><strong>Approved on:</strong> {approval.approvedDate}</p>
                </div>
              )}

              {approval.status === 'rejected' && (
                <div className="approval-details">
                  <p><strong>Rejected by:</strong> {approval.rejectedBy}</p>
                  <p><strong>Rejected on:</strong> {approval.rejectedDate}</p>
                  <p><strong>Reason:</strong> {approval.rejectionReason}</p>
                </div>
              )}
            </div>

            {approval.status === 'pending' && approval.canApprove && (
              <div className="approval-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handleApprove(approval)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(approval)}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredApprovals.length === 0 && (
        <div className="no-approvals">
          <p>No approvals found for the selected filter.</p>
        </div>
      )}
    </div>
  );
};

export default Approvals;