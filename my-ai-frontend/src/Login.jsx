
import { useState } from 'react'
import './Login.css'

function Login({ onLogin, onSignup, signupSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Login failed. Check your credentials.'
        )
      }

      if (!data.token) {
        throw new Error('The server response did not contain a JWT token.')
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
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        {error && <p className="login-error" role="alert">{error}</p>}

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
