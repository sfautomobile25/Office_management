import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [validToken, setValidToken] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        text: 'Very weak',
        color: '#f56565'
    });

    // Verify token on component mount
    useEffect(() => {
        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            // In a real app, you'd verify the token with your backend
            // For now, we'll simulate verification
            setTimeout(() => {
                if (token && token.length > 10) {
                    setValidToken(true);
                } else {
                    setError('Invalid or expired reset token');
                }
                setVerifying(false);
            }, 1000);
        } catch (err) {
            setError('Failed to verify reset token');
            setVerifying(false);
        }
    };

    const checkPasswordStrength = (password) => {
        let score = 0;
        
        // Length check
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) score += 1; // Uppercase
        if (/[a-z]/.test(password)) score += 1; // Lowercase
        if (/[0-9]/.test(password)) score += 1; // Numbers
        if (/[^A-Za-z0-9]/.test(password)) score += 1; // Special chars
        
        let text, color;
        if (score >= 5) {
            text = 'Strong';
            color = '#48bb78';
        } else if (score >= 3) {
            text = 'Medium';
            color = '#ed8936';
        } else {
            text = 'Weak';
            color = '#f56565';
        }
        
        setPasswordStrength({ score, text, color });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        
        if (name === 'password') {
            checkPasswordStrength(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (passwordStrength.score < 3) {
            setError('Password is too weak. Please use a stronger password.');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await authAPI.resetPassword(token, formData.password);
            
            if (response.data.success) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError(response.data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="reset-container">
                <div className="reset-box">
                    <div className="loading-state">
                        <div className="loading-spinner-large"></div>
                        <div className="loading-text">Verifying reset link...</div>
                        <div className="loading-subtext">Please wait</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!validToken && !verifying) {
        return (
            <div className="reset-container">
                <div className="reset-box">
                    <div className="error-box">
                        <div className="error-icon">❌</div>
                        <h3>Invalid Reset Link</h3>
                        <p>The password reset link is invalid or has expired.</p>
                        <div className="error-actions">
                            <Link to="/forgot-password" className="btn-primary">
                                Request New Link
                            </Link>
                            <Link to="/login" className="btn-secondary">
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="reset-container">
                <div className="reset-box success">
                    <div className="success-icon animated">🎉</div>
                    <h2>Password Reset Successful!</h2>
                    <p>Your password has been successfully reset.</p>
                    <p>You will be redirected to the login page shortly.</p>
                    <div className="success-actions">
                        <Link to="/login" className="btn-primary">
                            Go to Login Now
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="reset-container">
            <div className="reset-box">
                <div className="reset-header">
                    <h2>🔑 Reset Password</h2>
                    <p>Enter your new password below</p>
                </div>

                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="reset-form">
                    <div className="form-group">
                        <label>New Password</label>
                        <div className="password-field">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter new password"
                                required
                                minLength="8"
                            />
                            <button 
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </button>
                        </div>
                        
                        <div className="password-strength">
                            <div className="strength-bar">
                                <div 
                                    className="strength-fill"
                                    style={{ 
                                        width: `${(passwordStrength.score / 6) * 100}%`,
                                        backgroundColor: passwordStrength.color
                                    }}
                                />
                            </div>
                            <div className="strength-text">
                                Strength: {passwordStrength.text}
                            </div>
                        </div>
                        
                        <div className="password-requirements">
                            <h4>Password must contain:</h4>
                            <ul className="requirement-list">
                                <li className={formData.password.length >= 8 ? "valid" : "invalid"}>
                                    At least 8 characters
                                </li>
                                <li className={/[A-Z]/.test(formData.password) ? "valid" : "invalid"}>
                                    One uppercase letter
                                </li>
                                <li className={/[0-9]/.test(formData.password) ? "valid" : "invalid"}>
                                    One number
                                </li>
                                <li className={/[^A-Za-z0-9]/.test(formData.password) ? "valid" : "invalid"}>
                                    One special character
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <div className="password-field">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm new password"
                                required
                                minLength="8"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="btn-primary"
                        disabled={loading || passwordStrength.score < 3}
                    >
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>

                <div className="back-to-login">
                    <Link to="/login">
                        <span className="arrow">←</span>
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;