import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.forgotPassword(email);
            if (response.data.success) {
                setSuccess(true);
            } else {
                setError(response.data.error || 'Failed to send reset email');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="forgot-container">
                <div className="forgot-box success">
                    <div className="success-icon">📧</div>
                    <h2>Check Your Email</h2>
                    <p>We've sent password reset instructions to:</p>
                    <p className="email-sent">{email}</p>
                    <div className="success-actions">
                        <Link to="/login" className="btn-primary">
                            Return to Login
                        </Link>
                    </div>
                    <p className="check-spam">
                        Didn't receive the email? Check your spam folder.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="forgot-container">
            <div className="forgot-box">
                <div className="forgot-header">
                    <h2>🔐 Forgot Password</h2>
                    <p>Enter your email to reset your password</p>
                </div>

                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="forgot-form">
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Sending...' : 'Send Reset Instructions'}
                    </button>
                </form>

                <div className="forgot-footer">
                    <p>
                        Remember your password? 
                        <Link to="/login" className="login-link"> Login here</Link>
                    </p>
                    <p>
                        Don't have an account? 
                        <Link to="/register" className="register-link"> Register here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;