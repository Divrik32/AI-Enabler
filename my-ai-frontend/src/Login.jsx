import { useState } from 'react'
import './Login.css'

function Login({
  onLogin,
  onSignup,
  onForgotPassword,
  signupSuccess
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          'Login failed. Check your credentials.'
        )
      }

      if (!data.token) {
        throw new Error(
          'The server response did not contain a JWT token.'
        )
      }

      onLogin(data)
    } catch (err) {
      setError(
        err.message.includes('Failed to fetch')
          ? 'Cannot connect to the backend. Make sure Spring Boot is running on port 8080.'
          : err.message
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

        <h1>Welcome to MY AI</h1>

        <p className="login-description">
          Sign in to continue to your AI assistant.
        </p>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>

        <div className="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <button
            type="button"
            className="password-toggle"
            onClick={() =>
              setShowPassword((current) => !current)
            }
            aria-label={
              showPassword ? 'Hide password' : 'Show password'
            }
            aria-pressed={showPassword}
            title={
              showPassword ? 'Hide password' : 'Show password'
            }
          >
            {showPassword ? (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 9.3 3.1 11 7a11.8 11.8 0 0 1-4 5.1" />
    <path d="M6.5 6.5A11.8 11.8 0 0 0 1 12c1.7 3.9 6 7 11 7 1.5 0 3-.3 4.3-.9" />
  </svg>
) : (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)}
          </button>
        </div>

        {/* Forgot Password */}
        <div className="forgot-password-row">
          <button
            type="button"
            className="auth-link"
            onClick={onForgotPassword}
          >
            Forgot Password?
          </button>
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {signupSuccess && (
          <p className="signup-success" role="status">
            Account created successfully! Please sign in.
          </p>
        )}

        <p className="auth-switch">
          Don't have an account?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={onSignup}
          >
            Sign Up
          </button>
        </p>
      </form>
    </main>
  )
}

export default Login
