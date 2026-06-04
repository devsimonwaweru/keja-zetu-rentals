import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Building2, Users, DollarSign } from 'lucide-react'

/* ---------- Optimized Action Card ---------- */
const ActionCard = ({ icon: IconComponent, label, onClick }) => {
  if (!IconComponent) return null

  return (
    <div
      onClick={onClick}
      style={{
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        padding: '24px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        transition: 'transform 0.2s ease, background 0.2s ease',
        minHeight: '120px', // Ensures good tap area on mobile
        textAlign: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#252525'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#1a1a1a'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <IconComponent size={32} color="var(--primary-green)" />
      <div style={{ color: '#ccc', fontWeight: '500', fontSize: '14px' }}>
        {label}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    properties: 0,
    occupied: 0,
    collected: 0,
    arrears: 0
  })

  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    initDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- Load everything ---------- */
  const initDashboard = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.user) return

      await Promise.all([
        fetchUserProfile(session.user.id),
        fetchStats(session.user.id)
      ])
    } catch (err) {
      console.error(err)
    }
  }

  /* ---------- Fetch profile ---------- */
  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setUserName(data.full_name)
    }
  }

  /* ---------- Fetch dashboard stats ---------- */
  const fetchStats = async (userId) => {
    try {
      setLoading(true)

      // Properties
      const { count: propertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Occupied units
      const { count: occupiedCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'occupied')

      // Payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)

      // Arrears
      const { data: tenants } = await supabase
        .from('tenants')
        .select('balance')
        .eq('user_id', userId)

      const totalCollected =
        payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

      const totalArrears =
        tenants?.reduce((sum, t) => sum + Number(t.balance || 0), 0) || 0

      setStats({
        properties: propertyCount || 0,
        occupied: occupiedCount || 0,
        collected: totalCollected,
        arrears: totalArrears
      })
    } catch (error) {
      console.error('Dashboard stats error:', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '0 4px' }}> {/* Small padding to prevent edge clipping on mobile */}
      
      {/* ---------- Responsive Header ---------- */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', // Stack on mobile
        marginBottom: '24px', 
        gap: '8px'
      }}>
        <h3 style={{ margin: 0 }}>Dashboard</h3>
        <div style={{ color: '#888', fontSize: '14px' }}>
          {userName ? `Welcome back, ${userName}` : 'Loading...'}
        </div>
      </div>

      {/* ---------- Responsive Stats Grid ---------- */}
      {/* minmax(140px, 1fr) ensures 2 columns on mobile, 4 on desktop */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px'
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="stat-card skeleton"
              style={{ height: '120px', background: '#1a1a1a', borderRadius: '12px' }}
            />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          // MAGIC HANDLE: Fits 2 items on mobile (<400px), expands to 4 on desktop
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: '#1a1a1a' }}>
            <div className="stat-label" style={{ fontSize: '13px', color: '#888' }}>Properties</div>
            <div className="stat-value" style={{ fontSize: '28px', marginTop: '8px', fontWeight: '700' }}>{stats.properties}</div>
          </div>

          <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: '#1a1a1a' }}>
            <div className="stat-label" style={{ fontSize: '13px', color: '#888' }}>Occupied Units</div>
            <div className="stat-value" style={{ fontSize: '28px', marginTop: '8px', fontWeight: '700' }}>{stats.occupied}</div>
          </div>

          <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: '#1a1a1a', borderLeft: '4px solid var(--primary-green)' }}>
            <div className="stat-label" style={{ fontSize: '13px', color: '#888' }}>Collected</div>
            <div className="stat-value" style={{ fontSize: '22px', marginTop: '8px', fontWeight: '700', color: 'var(--primary-green)' }}>
              KES {stats.collected.toLocaleString()}
            </div>
          </div>

          <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: '#1a1a1a', borderLeft: '4px solid #ef4444' }}>
            <div className="stat-label" style={{ fontSize: '13px', color: '#888' }}>Arrears</div>
            <div className="stat-value" style={{ fontSize: '22px', marginTop: '8px', fontWeight: '700', color: '#ef4444' }}>
              KES {stats.arrears.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Quick actions ---------- */}
      <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '16px' }}>Quick Actions</h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', // Fits 3 on mobile nicely
        gap: '16px'
      }}>
        <ActionCard
          icon={Building2}
          label="Add Property"
          onClick={() => navigate('/properties')}
        />

        <ActionCard
          icon={Users}
          label="Add Tenant"
          onClick={() => navigate('/tenants')}
        />

        <ActionCard
          icon={DollarSign}
          label="Record Payment"
          onClick={() => navigate('/payments')}
        />
      </div>
    </div>
  )
}