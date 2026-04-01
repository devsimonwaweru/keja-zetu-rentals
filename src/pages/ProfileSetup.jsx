import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ProfileSetup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [accountType, setAccountType] = useState('landlord')
  const [agencyName, setAgencyName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [userId, setUserId] = useState(null)

  // Fetch logged in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) navigate('/login')
      else setUserId(user.id)
    }
    fetchUser()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !phone) {
      setErrorMsg('Please fill all required fields')
      return
    }
    if (accountType === 'agency' && !agencyName) {
      setErrorMsg('Please provide agency name')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        phone,
        agency_mode: accountType === 'agency',
        // Store agency name in a custom column if desired
      })
      if (error) throw error
      navigate('/') // redirect to dashboard after setup
    } catch (error) {
      setErrorMsg(error.message)
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
        <h1>Set Up Your Profile</h1>
        <p>Manage rental zako bila stress</p>

        {errorMsg && (
          <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Account Type</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
              <option value="landlord">Individual Landlord</option>
              <option value="agency">Agency / Company</option>
            </select>
          </div>
          {accountType === 'agency' && (
            <div className="input-group">
              <input
                type="text"
                placeholder="Agency Name"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                required={accountType === 'agency'}
              />
            </div>
          )}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
