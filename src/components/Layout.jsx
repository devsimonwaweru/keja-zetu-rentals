// src/components/Layout.jsx
import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

import { 
  LayoutDashboard, 
  Building2, 
  Layers, 
  Users, 
  DollarSign, 
  Wrench, 
  FileText, 
  Settings, 
  Menu,
  LogOut,
  MessageSquare
} from 'lucide-react'

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      if (error) throw error

      setUserName(data?.full_name || 'User')
    } catch (error) {
      console.error('Error fetching user profile:', error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Properties', path: '/properties', icon: Building2 },
    { name: 'Units', path: '/units', icon: Layers },
    { name: 'Tenants', path: '/tenants', icon: Users },
    { name: 'Rent & Payments', path: '/payments', icon: DollarSign },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  const isActive = (path) => (location.pathname === path ? 'active' : '')

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <nav className={`sidebar ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="nav-menu">
          
          {/* Branding Area */}
          <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid #333', marginBottom: '10px' }}>
             <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>keja-zetu</h3>
             <span style={{ fontSize: '10px', color: 'var(--accent-red)', letterSpacing: '1px', fontWeight: '600' }}>GROUP OF COMPANIES</span>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item ${isActive(item.path)}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}

          <button
            className="nav-item"
            style={{ color: 'var(--accent-red)', marginTop: 'auto' }}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOP BAR */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                marginRight: '12px',
                cursor: 'pointer',
              }}
            >
              <Menu />
            </button>
          </div>

          <h2>
            {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
          </h2>

          <div
            className="user-profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ color: 'white' }}>{userName || 'Loading...'}</span>

            <div
              style={{
                width: '36px',
                height: '36px',
                background: 'var(--primary-blue)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Users size={20} />
            </div>
          </div>
        </header>

        <div className="content-view">
          <Outlet />
        </div>
      </main>
    </div>
  )
}