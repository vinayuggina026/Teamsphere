import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, email: email.trim().toLowerCase(), password });
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message;
      const valErrors = err?.response?.data?.errors;
      const network = err?.message;

      setError(
        msg ||
          (valErrors?.[0]?.msg ??
            (network ? `Network error: ${network}` : 'Register failed'))
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">TeamSphere</h1>
        <p className="auth-subtitle">Register</p>

        {error ? <div className="auth-error">{error}</div> : null}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">
            Name
            <input
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
            />
          </label>

          <label className="auth-label">
            Email
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
            />
          </label>

          <button className="auth-button" disabled={submitting} type="submit">
            {submitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
