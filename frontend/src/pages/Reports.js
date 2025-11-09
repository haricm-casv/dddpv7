import React, { useState } from 'react';
import './Reports.css';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('financial');
  const [dateRange, setDateRange] = useState('month');

  const reportTypes = [
    { id: 'financial', name: 'Financial Report', icon: '💰' },
    { id: 'occupancy', name: 'Occupancy Report', icon: '🏢' },
    { id: 'maintenance', name: 'Maintenance Report', icon: '🔧' },
    { id: 'user_activity', name: 'User Activity Report', icon: '👥' },
    { id: 'approval_summary', name: 'Approval Summary', icon: '✅' }
  ];

  const generateReport = () => {
    // Mock report generation
    alert(`Generating ${reportTypes.find(r => r.id === selectedReport)?.name} for ${dateRange}...`);
  };

  const exportReport = (format) => {
    // Mock export functionality
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <div className="report-controls">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <button className="btn btn-primary" onClick={generateReport}>
            Generate Report
          </button>
        </div>
      </div>

      <div className="reports-content">
        <div className="report-types">
          <h3>Report Types</h3>
          <div className="report-list">
            {reportTypes.map(report => (
              <div
                key={report.id}
                className={`report-item ${selectedReport === report.id ? 'active' : ''}`}
                onClick={() => setSelectedReport(report.id)}
              >
                <span className="report-icon">{report.icon}</span>
                <span className="report-name">{report.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-preview">
          <div className="report-header">
            <h3>{reportTypes.find(r => r.id === selectedReport)?.name}</h3>
            <div className="export-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => exportReport('pdf')}
              >
                Export PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => exportReport('excel')}
              >
                Export Excel
              </button>
            </div>
          </div>

          <div className="report-content">
            {selectedReport === 'financial' && (
              <div className="financial-report">
                <div className="report-section">
                  <h4>Revenue Summary</h4>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-value">₹2,45,000</div>
                      <div className="metric-label">Total Revenue</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">₹1,85,000</div>
                      <div className="metric-label">Rent Collected</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">₹60,000</div>
                      <div className="metric-label">Maintenance Fees</div>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Expense Breakdown</h4>
                  <div className="expense-list">
                    <div className="expense-item">
                      <span>Maintenance & Repairs</span>
                      <span>₹35,000</span>
                    </div>
                    <div className="expense-item">
                      <span>Utilities</span>
                      <span>₹25,000</span>
                    </div>
                    <div className="expense-item">
                      <span>Security</span>
                      <span>₹15,000</span>
                    </div>
                    <div className="expense-item">
                      <span>Administrative</span>
                      <span>₹10,000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'occupancy' && (
              <div className="occupancy-report">
                <div className="report-section">
                  <h4>Occupancy Statistics</h4>
                  <div className="occupancy-stats">
                    <div className="stat-item">
                      <div className="stat-value">95%</div>
                      <div className="stat-label">Overall Occupancy</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">72/75</div>
                      <div className="stat-label">Occupied Units</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">3</div>
                      <div className="stat-label">Vacant Units</div>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Floor-wise Occupancy</h4>
                  <div className="floor-occupancy">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(floor => (
                      <div key={floor} className="floor-item">
                        <span>Floor {floor}</span>
                        <span>{Math.floor(Math.random() * 3) + 3}/5 occupied</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'maintenance' && (
              <div className="maintenance-report">
                <div className="report-section">
                  <h4>Maintenance Summary</h4>
                  <div className="maintenance-stats">
                    <div className="stat-item">
                      <div className="stat-value">24</div>
                      <div className="stat-label">Total Requests</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">18</div>
                      <div className="stat-label">Completed</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">6</div>
                      <div className="stat-label">Pending</div>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Common Issues</h4>
                  <div className="issues-list">
                    <div className="issue-item">
                      <span>Plumbing</span>
                      <span>8 requests</span>
                    </div>
                    <div className="issue-item">
                      <span>Electrical</span>
                      <span>6 requests</span>
                    </div>
                    <div className="issue-item">
                      <span>HVAC</span>
                      <span>4 requests</span>
                    </div>
                    <div className="issue-item">
                      <span>General Repairs</span>
                      <span>6 requests</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'user_activity' && (
              <div className="activity-report">
                <div className="report-section">
                  <h4>User Activity Metrics</h4>
                  <div className="activity-stats">
                    <div className="stat-item">
                      <div className="stat-value">150</div>
                      <div className="stat-label">Active Users</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">1,247</div>
                      <div className="stat-label">Logins This Month</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">89</div>
                      <div className="stat-label">New Registrations</div>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Role Distribution</h4>
                  <div className="role-distribution">
                    <div className="role-item">
                      <span>Owners</span>
                      <span>45</span>
                    </div>
                    <div className="role-item">
                      <span>Tenants</span>
                      <span>89</span>
                    </div>
                    <div className="role-item">
                      <span>PST Committee</span>
                      <span>12</span>
                    </div>
                    <div className="role-item">
                      <span>Admin</span>
                      <span>4</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'approval_summary' && (
              <div className="approval-report">
                <div className="report-section">
                  <h4>Approval Statistics</h4>
                  <div className="approval-stats">
                    <div className="stat-item">
                      <div className="stat-value">156</div>
                      <div className="stat-label">Total Approvals</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">142</div>
                      <div className="stat-label">Approved</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">14</div>
                      <div className="stat-label">Rejected</div>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Approval Types</h4>
                  <div className="approval-types">
                    <div className="type-item">
                      <span>Tenant Applications</span>
                      <span>67</span>
                    </div>
                    <div className="type-item">
                      <span>Maintenance Budget</span>
                      <span>45</span>
                    </div>
                    <div className="type-item">
                      <span>Parking Assignments</span>
                      <span>32</span>
                    </div>
                    <div className="type-item">
                      <span>Ownership Transfers</span>
                      <span>12</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;