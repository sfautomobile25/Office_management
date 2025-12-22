import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function Login({ onLogin }) {
    const [formData, setFormData] = useState({
        username: 'admin',
        password: 'admin123'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Attempting login...');
            const response = await authAPI.login(formData);
            
            if (response.data.success) {
                console.log('Login successful:', response.data);
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                }
                onLogin(response.data.user);
            } else {
                setError(response.data.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.error || 'Connection failed. Make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h1 style={styles.title}>🏠 Real Estate Admin</h1>
                <h2 style={styles.subtitle}>Administration Panel</h2>
                
                {error && (
                    <div style={styles.error}>
                        ⚠️ {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        style={styles.button}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                    <div className="login-footer">
                        <p>
                            Don't have an account? 
                            <Link to="/register" className="register-link"> Register here</Link>
                        </p>
                        <p>
                            <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
                        </p>
                    </div>
                <div style={styles.info}>
                    <p>Default credentials:</p>
                    <p>Username: <strong>admin</strong></p>
                    <p>Password: <strong>admin123</strong></p>
                </div>
                
                <div style={styles.footer}>
                    <p>Make sure backend server is running on port 5000</p>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px'
    },
    loginBox: {
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
    },
    title: {
        color: '#333',
        marginBottom: '10px',
        textAlign: 'center'
    },
    subtitle: {
        color: '#666',
        marginBottom: '30px',
        textAlign: 'center',
        fontWeight: 'normal'
    },
    form: {
        marginBottom: '20px'
    },
    inputGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        color: '#555',
        fontWeight: '500'
    },
    input: {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '16px',
        boxSizing: 'border-box'
    },
    button: {
        width: '100%',
        padding: '12px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'background 0.3s'
    },
    error: {
        background: '#ffebee',
        color: '#c62828',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '20px',
        textAlign: 'center'
    },
    info: {
        background: '#f8f9fa',
        padding: '15px',
        borderRadius: '6px',
        marginBottom: '20px',
        fontSize: '14px',
        color: '#666'
    },
    footer: {
        textAlign: 'center',
        fontSize: '12px',
        color: '#999',
        marginTop: '20px'
    }
};

export default Login;