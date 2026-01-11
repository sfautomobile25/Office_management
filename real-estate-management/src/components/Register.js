import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (!formData.agreeTerms) {
            setError('You must agree to the terms and conditions');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword
            });

            if (response.data.success) {
                setSuccess(true);
                setFormData({
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    agreeTerms: false
                });
                toast.success("Register Successful.");
            } else {
                setError(response.data.error || 'Registration failed');
            }
        } catch (err) {
            toast.error('Registration error:', err);
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="register-container">
                <div className="register-box success">
                    <div className="success-icon">🎉</div>
                    <h2>Registration Successful!</h2>
                    <p>Your account has been created successfully.</p>
                    <p>You can now login to your account.</p>
                    <div className="success-actions">
                        <Link to="/login" className="btn-primary">
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="register-container">
            <div className="register-box">
                <div className="register-header">
                    <h1>🏠 Real Estate</h1>
                    <h2>Create New Account</h2>
                    <p>Join our real estate management platform</p>
                </div>

                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="username">
                            <span className="label-icon">👤</span>
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter your username"
                            required
                            minLength="3"
                        />
                        <div className="form-hint">
                            Must be at least 3 characters
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">
                            <span className="label-icon">📧</span>
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <span className="label-icon">🔒</span>
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            required
                            minLength="6"
                        />
                        <div className="form-hint">
                            Must be at least 6 characters
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            <span className="label-icon">🔐</span>
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            required
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                required
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-text">
                                I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
                            </span>
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        className="btn-primary register-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>

                    <div className="register-divider">
                        <span>OR</span>
                    </div>

                    <div className="social-register">
                        <button type="button" className="btn-social google">
                            <span className="social-icon">G</span>
                            Continue with Google
                        </button>
                        <button type="button" className="btn-social github">
                            <span className="social-icon">G</span>
                            Continue with GitHub
                        </button>
                    </div>
                </form>

                <div className="register-footer">
                    <p>
                        Already have an account? 
                        <Link to="/login" className="login-link"> Login here</Link>
                    </p>
                    <p className="admin-note">
                        Admin? Login with default credentials: admin / admin123
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;