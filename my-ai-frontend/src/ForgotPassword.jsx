import { useState } from 'react'
import './Login.css'

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          'Unable to process password reset request.'
        )
      }

      setSuccess(
        'If an account exists with this email, a password reset link has been sent.'
      )
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Make sure Spring Boot is running.'
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

        <h1>Forgot Password?</h1>

        <p className="login-description">
          Enter your registered email address.
          We'll send you a link to reset your password.
        </p>

        <label htmlFor="forgot-email">Email Address</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your registered email"
          autoComplete="email"
          required
        />

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

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className="auth-switch">
          Remember your password?{' '}
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

export default ForgotPassword
