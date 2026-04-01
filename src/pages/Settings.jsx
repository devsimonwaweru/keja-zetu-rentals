import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { User, Building, Percent, Save, LogOut } from 'lucide-react'

export default function Settings() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '', commission_rate: 10, agency_mode: false })
  
  // Form State (Local copy)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [commissionRate, setCommissionRate] = useState(10)
  const [agencyMode, setAgencyMode] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      setProfile(data || { full_name: '', email: '', phone: '', commission_rate: 10, agency_mode: false })
      setFullName(data?.full_name || '')
      setPhone(data?.phone || '')
      setCommissionRate(data?.commission_rate || 10)
      setAgencyMode(data?.agency_mode || false)
    } catch (error) {
      console.error('Error fetching profile', error.message)
    }
  }

  const updateProfile = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const user = (await supabase.auth.getUser()).data.user
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          commission_rate: parseInt(commissionRate),
          agency_mode: agencyMode
        })
        .eq('id', user.id)

      if (error) throw error
      
      setProfile(prev => ({ ...prev, full_name: fullName, phone, commission_rate: parseInt(commissionRate), agencyMode }))
      alert('Settings updated successfully!')
    } catch (error) {
      alert('Error updating settings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Settings</h3>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Manage your account and preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* --- 1. PERSONAL PROFILE --- */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} />
            </div>
            <div>
              <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>Personal Details</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{profile.email}</span>
            </div>
          </div>

          <form onSubmit={updateProfile} style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. KEJA-ZETU Admin" style={{ padding: '8px 12px' }} />
              </div>
              
              <div className="input-group">
                <label>Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07..." style={{ padding: '8px 12px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                {loading ? 'Saving...' : <><Save size={14} style={{ marginRight: '4px' }} /> Save</>}
              </button>
            </div>
          </form>
        </div>

        {/* --- 2. AGENCY SETTINGS --- */}
        <div className="stat-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={18} />
            </div>
            <div>
              <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>Agency Mode</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Configure landlord commissions</span>
            </div>
          </div>

          <form onSubmit={updateProfile} style={{ maxWidth: '100%' }}>
            <div className="input-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>Enable Agency Mode</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Track commissions for landlords</div>
              </div>
              <input 
                type="checkbox" 
                checked={agencyMode} 
                onChange={(e) => setAgencyMode(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-green)' }}
              />
            </div>

            {agencyMode && (
              <div className="input-group" style={{ marginTop: '10px' }}>
                <label><Percent size={12} style={{verticalAlign:'middle', marginRight:'4px'}} /> Commission Rate (%)</label>
                <input 
                  type="number" 
                  value={commissionRate} 
                  onChange={(e) => setCommissionRate(e.target.value)} 
                  placeholder="10"
                  min="0"
                  max="100"
                  style={{ padding: '8px 12px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                {loading ? 'Saving...' : <><Save size={14} style={{ marginRight: '4px' }} /> Save</>}
              </button>
            </div>
          </form>
        </div>

        {/* --- 3. ACTIONS --- */}
        <button 
          className="btn" 
          style={{ 
            alignSelf: 'flex-start', 
            background: 'transparent', 
            border: '1px solid #ef4444', 
            color: '#ef4444', 
            padding: '8px 16px', 
            fontSize: '0.85rem',
            fontWeight: '500' 
          }}
          onClick={handleLogout}
        >
          <LogOut size={16} style={{ marginRight: '6px' }} /> Logout
        </button>
      </div>
    </div>
  )
}