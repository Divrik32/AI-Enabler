import { useState } from 'react'
import './Login.css'

function ResetPassword({ onBackToLogin }) {
  const token = new URLSearchParams(
    window.location.search
  ).get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!token) {
      setError('Invalid password reset link.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            newPassword,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          'Unable to reset password.'
        )
      }

      setSuccess(
        'Your password has been reset successfully. You can now sign in.'
      )
      setNewPassword('')
      setConfirmPassword('')

    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend.'
          : err.message || 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img
          className="login-logo"
          src="/my-ai-logo.png"
          alt="MY AI logo"
        />

        <h1>Reset Password</h1>

        <p className="login-description">
          Enter your new password below.
        </p>

        {!token && (
          <p className="login-error" role="alert">
            This password reset link is invalid.
          </p>
        )}

        {!success && token && (
          <>
            <label htmlFor="newPassword">
              New Password
            </label>

            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              placeholder="Enter new password"
              autoComplete="new-password"
              required
            />

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />

            <div className="reset-show-password">
              <label>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) =>
                    setShowPassword(event.target.checked)
                  }
                />
                Show Password
              </label>
            </div>
          </>
        )}

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="signup-success" role="status">
            {success}
          </p>
        )}

        {!success && token && (
          <button type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        )}

        <p className="auth-switch">
          <button
            type="button"
            className="auth-link"
            onClick={onBackToLogin}
          >
            Back to Login
          </button>
        </p>
      </form>
    </main>
  )
}

export default ResetPassword
