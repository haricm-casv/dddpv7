import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './EmailVerification.css';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useContext(AuthContext);

  const [verificationCode, setVerificationCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [step, setStep] = useState('enter-code'); // 'enter-code' or 'success'

  // Get email from location state or user context
  const email = location.state?.email || user?.email;

  const handleSendVerification = async () => {
    if (!email) {
      toast.error('No email address found. Please update your profile with an email address.');
      navigate('/profile');
      return;
    }

    setResendLoading(true);

    try {
      const response = await axios.post('/api/v1/auth/send-verification');
      setVerificationToken(response.data.data.verification_token);
      setStep('enter-code');
      toast.success('Verification code sent to your email');
    } catch (error) {
      console.error('Send verification error:', error);

      if (error.response?.data?.error) {
        const { code, message } = error.response.data.error;

        switch (code) {
          case 'NO_EMAIL':
            toast.error('No email address associated with your account');
            navigate('/profile');
            break;
          case 'ALREADY_VERIFIED':
            toast.success('Your email is already verified');
            navigate('/dashboard');
            break;
          default:
            toast.error(message || 'Failed to send verification code');
        }
      } else {
        toast.error('Failed to send verification code. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/v1/auth/verify-email', {
        verification_token: verificationToken,
        code: verificationCode.trim()
      });

      // Update user context to reflect verified email
      if (user) {
        updateUser({ ...user, email_verified: true });
      }

      setStep('success');
      toast.success('Email verified successfully!');

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Verification error:', error);

      if (error.response?.data?.error) {
        const { code, message } = error.response.data.error;

        switch (code) {
          case 'INVALID_VERIFICATION_CODE':
            toast.error('Invalid verification code. Please check and try again.');
            break;
          case 'ALREADY_VERIFIED':
            toast.success('Your email is already verified');
            navigate('/dashboard');
            break;
          case 'VALIDATION_ERROR':
            toast.error('Please enter a valid 6-digit code');
            break;
          default:
            toast.error(message || 'Verification failed');
        }
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setVerificationCode(value);
    }
  };

  const handleResendCode = async () => {
    await handleSendVerification();
  };

  // Auto-send verification code on component mount if we have an email
  React.useEffect(() => {
    if (email && !verificationToken) {
      handleSendVerification();
    }
  }, [email]);

  if (step === 'success') {
    return (
      <div className="email-verification-page">
        <div className="verification-container">
          <div className="verification-header">
            <div className="success-icon">✓</div>
            <h1>Email Verified!</h1>
            <p>Your email address has been successfully verified.</p>
          </div>

          <div className="verification-content">
            <div className="success-message">
              <h2>Welcome to DD Diamond Park!</h2>
              <p>You can now access all features of the apartment management system.</p>
            </div>

            <div className="next-steps">
              <h3>What happens next?</h3>
              <ul>
                <li>Complete your profile information</li>
                <li>Explore apartment management features</li>
                <li>Connect with other residents</li>
                <li>Access maintenance and service requests</li>
              </ul>
            </div>
          </div>

          <div className="verification-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/profile')}
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="email-verification-page">
      <div className="verification-container">
        <div className="verification-header">
          <div className="email-icon">✉</div>
          <h1>Verify Your Email</h1>
          <p>We've sent a verification code to <strong>{email}</strong></p>
        </div>

        <form onSubmit={handleVerifyCode} className="verification-form">
          <div className="form-group">
            <label htmlFor="verification_code">Verification Code</label>
            <input
              type="text"
              id="verification_code"
              value={verificationCode}
              onChange={handleCodeChange}
              placeholder="Enter 6-digit code"
              maxLength="6"
              className="code-input"
              autoFocus
            />
            <p className="form-help">
              Enter the 6-digit code sent to your email address
            </p>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>
        </form>

        <div className="verification-footer">
          <p>
            Didn't receive the code?{' '}
            <button
              type="button"
              className="link-button"
              onClick={handleResendCode}
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
          </p>

          <p>
            Wrong email address?{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/profile')}
            >
              Update Email
            </button>
          </p>
        </div>

        <div className="verification-help">
          <h3>Need Help?</h3>
          <ul>
            <li>Check your spam/junk folder</li>
            <li>Make sure your email address is correct</li>
            <li>Contact support if you continue having issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;