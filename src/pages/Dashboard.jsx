import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Building2, Users, DollarSign } from 'lucide-react'

/* ---------- Small reusable action card ---------- */
const ActionCard = ({ icon: IconComponent, label, onClick }) => {
  if (!IconComponent) return null

  return (
    <div
      className="stat-card"
      style={{ cursor: 'pointer', background: '#252525', padding: '20px' }}
      onClick={onClick}
    >
      <IconComponent size={40} color="var(--primary-green)" style={{ marginBottom: '12px' }} />
      <div style={{ color: '#fff', fontWeight: '600' }}>{label}</div>
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
    <div>
      {/* ---------- Header ---------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3>Dashboard Overview</h3>
        <div style={{ color: '#fff', fontWeight: '600' }}>
          {userName ? `Logged in as ${userName}` : 'Loading user...'}
        </div>
      </div>

      {/* ---------- Stats ---------- */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px'
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="stat-card skeleton"
              style={{ aspectRatio: '1 / 1' }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}
        >
          <div className="stat-card">
            <div className="stat-label">Total Properties</div>
            <div className="stat-value">{stats.properties}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Occupied Units</div>
            <div className="stat-value">{stats.occupied}</div>
          </div>

          <div className="stat-card gold-accent">
            <div className="stat-label">Rent Collected</div>
            <div className="stat-value">
              KES {stats.collected.toLocaleString()}
            </div>
          </div>

          <div className="stat-card danger">
            <div className="stat-label">Arrears</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>
              KES {stats.arrears.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Quick actions ---------- */}
      <h4 style={{ color: '#fff', marginBottom: '16px' }}>Quick Actions</h4>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}
      >
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
