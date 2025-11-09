import React from 'react';
import './ApprovalWorkflows.css';

const ApprovalWorkflows = ({ workflows = [], showActions = false, onApprove, onReject }) => {
  const statusColors = {
    pending: '#f39c12',
    approved: '#27ae60',
    rejected: '#e74c3c',
    in_review: '#3498db'
  };

  const getWorkflowStep = (workflow) => {
    if (workflow.status === 'approved') return { current: 'Completed', next: 'N/A' };
    if (workflow.status === 'rejected') return { current: 'Rejected', next: 'N/A' };

    switch (workflow.type) {
      case 'user_registration':
        return { current: 'PST Review', next: 'Account Activation' };
      case 'ownership_transfer':
        return { current: 'PST Review', next: 'Transfer Processing' };
      case 'ownership_relationship':
        return { current: 'PST Review', next: 'Ownership Setup' };
      case 'tenant_relationship':
        return { current: 'PST Review', next: 'Lease Activation' };
      default:
        return { current: 'Under Review', next: 'Final Approval' };
    }
  };

  const displayWorkflows = workflows.length > 0 ? workflows : [];

  return (
    <div className="approval-workflows">
      <div className="workflows-header">
        <h4>Approval Workflows</h4>
        <span className="workflows-count">{displayWorkflows.length} active</span>
      </div>

      <div className="workflows-list">
        {displayWorkflows.map((workflow) => (
          <div key={workflow.id} className="workflow-item">
            <div className="workflow-status">
              <span
                className="status-indicator"
                style={{ backgroundColor: statusColors[workflow.status] }}
              ></span>
              <span className="status-text">{workflow.status.replace('_', ' ')}</span>
            </div>

            <div className="workflow-content">
              <div className="workflow-title">{workflow.title}</div>
              <div className="workflow-meta">
                <span className="workflow-submitter">{workflow.submittedBy}</span>
                <span className="workflow-date">{workflow.submittedDate}</span>
                <span className={`workflow-priority priority-${workflow.priority || 'medium'}`}>
                  {workflow.priority || 'medium'}
                </span>
              </div>
              <div className="workflow-description">{workflow.description}</div>
              <div className="workflow-progress">
                <span className="current-step">{getWorkflowStep(workflow).current}</span>
                {getWorkflowStep(workflow).next !== 'N/A' && (
                  <>
                    <span className="arrow">→</span>
                    <span className="next-step">{getWorkflowStep(workflow).next}</span>
                  </>
                )}
              </div>
            </div>

            {showActions && workflow.status === 'pending' && workflow.canApprove && (
              <div className="workflow-actions">
                <button
                  className="btn-approve"
                  onClick={() => onApprove && onApprove(workflow)}
                >
                  Approve
                </button>
                <button
                  className="btn-reject"
                  onClick={() => onReject && onReject(workflow)}
                >
                  Reject
                </button>
                <button className="btn-review">Review</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {displayWorkflows.length === 0 && (
        <div className="empty-workflows">
          <p>No active approval workflows</p>
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflows;