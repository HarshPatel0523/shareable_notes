import { useState } from 'react';
import './PasswordModal.css';

const PasswordModal = ({ isOpen, onClose, onSubmit, mode = 'encrypt', title = 'Password Protection' }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (mode === 'encrypt') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
    }

    try {
      await onSubmit(password);
      setPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="password-modal-overlay">
      <div className="password-modal">
        <div className="password-modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="password">
              {mode === 'encrypt' ? 'Set Password' : 'Enter Password'}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'encrypt' ? 'Enter a secure password' : 'Enter note password'}
              required
              autoFocus
            />
          </div>

          {mode === 'encrypt' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={handleClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="submit-btn">
              {isLoading ? 'Processing...' : mode === 'encrypt' ? 'Encrypt Note' : 'Unlock Note'}
            </button>
          </div>
        </form>

        {mode === 'encrypt' && (
          <div className="password-info">
            <p><strong>⚠️ Important:</strong> Keep your password safe. If you forget it, you won't be able to recover your note content.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordModal;