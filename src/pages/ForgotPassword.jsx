import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setMessage('Check your email for the reset link!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo-container">
            <img src="/icon-192.png" alt="Logo" className="login-logo" />
        </div>
        <h1>Reset Password</h1>
        <p>Enter your email to receive a reset link</p>

        {message && <div style={{ color:'#22c55e', marginBottom:'16px' }}>{message}</div>}
        {error && <div style={{ color:'#ef4444', marginBottom:'16px' }}>{error}</div>}

        <form onSubmit={handleForgotPassword}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ marginTop:'16px', fontSize:'0.9rem' }}>
          <span style={{ cursor:'pointer', color:'var(--primary-green)' }} onClick={() => navigate('/login')}>Back to Login</span>
        </div>
      </div>
    </div>
  )
}
