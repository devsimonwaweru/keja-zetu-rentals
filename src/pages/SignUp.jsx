// src/pages/SignUp.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function SignUp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error

      // Redirect to profile setup
      navigate('/setup-profile', { state: { userEmail: email } })
    } catch (error) {
      setErrorMsg(error.error_description || error.message)
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
        <h1>Create Account</h1>
        <p>Sign up to manage your properties</p>

        {errorMsg && (
          <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignUp}>
          <div className="input-group">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="input-group">
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <div className="input-group">
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

       <p>
            Already have an account? <span style={{ color:'#22c55e', cursor:'pointer' }} onClick={() => navigate('/login')}>Login</span>
          </p>
          <p>
            Forgot password? <span style={{ color:'#22c55e', cursor:'pointer' }} onClick={() => navigate('/reset-password')}>Reset</span>
          </p>
      </div>
    </div>
  )
}
