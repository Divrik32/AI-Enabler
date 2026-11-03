
import { useState } from 'react'
import './Login.css'

function Signup({ onBackToLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:8080/api/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Registration failed (${response.status})`
        )
      }

      // Return to login after successful registration.
      onBackToLogin(true)

    } catch (err) {
      setError(err.message || 'Unable to create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSignup}>
        <img
          className="login-logo"
          src="/my-ai-logo.png"
          alt="MY AI logo"
        />

        <h1>Create Account</h1>

        <p className="login-description">
          Sign up to start using MY AI.
        </p>

        <label htmlFor="signup-username">Username</label>
        <input
          id="signup-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          autoComplete="username"
          required
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          autoComplete="email"
          required
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
          required
        />

        <label htmlFor="signup-confirm">Confirm Password</label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>

        <p className="auth-switch">
          Already have an account?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => onBackToLogin(false)}
          >
            Sign In
          </button>
        </p>
      </form>
    </main>
  )
}

export default Signup
