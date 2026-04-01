import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('access_token') // Supabase sends this in URL

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      setError('')
      const { error } = await supabase.auth.updateUser({
        accessToken: token,
        password
      })
      if (error) throw error
      setMessage('Password successfully reset! Redirecting to login...')
      setTimeout(() => navigate('/login'), 3000)
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
        <h1>Set New Password</h1>

        {message && <div style={{ color:'#22c55e', marginBottom:'16px' }}>{message}</div>}
        {error && <div style={{ color:'#ef4444', marginBottom:'16px' }}>{error}</div>}

        <form onSubmit={handleResetPassword}>
          <div className="input-group">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
