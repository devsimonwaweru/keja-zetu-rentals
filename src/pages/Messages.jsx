/* eslint-disable react-hooks/set-state-in-effect */
// src/pages/Messages.jsx
import { useState, useEffect } from 'react'
import { 
  Send, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Search
} from 'lucide-react'

// Mock Data for demonstration
const MOCK_TENANTS = [
  { id: 1, name: 'John Doe', phone: '+254712345678', unit: 'A1', status: 'arrears', balance: 5000 },
  { id: 2, name: 'Jane Smith', phone: '+254723456789', unit: 'B2', status: 'paid', amount: 12000 },
  { id: 3, name: 'Mike Johnson', phone: '+254734567890', unit: 'C1', status: 'upcoming', dueDate: '2023-11-05' },
  { id: 4, name: 'Sarah Williams', phone: '+254745678901', unit: 'A2', status: 'arrears', balance: 12000 },
  { id: 5, name: 'Peter Grace', phone: '+254756789012', unit: 'D1', status: 'paid', amount: 15000 },
]

// FIXED: Changed keys to match activeTab IDs ('paid' and 'upcoming')
const Templates = {
  arrears: (t) => `Dear ${t.name}, we hope you are well. This is a gentle reminder regarding the outstanding rent balance of KES ${t.balance} for Unit ${t.unit}. Please arrange for payment at your earliest convenience. Thank you for your understanding.`,
  paid: (t) => `Hi ${t.name}, thank you for your rent payment of KES ${t.amount} for Unit ${t.unit}. We have received it successfully. Regards, KEJA-ZETU Management.`,
  upcoming: (t) => `Dear ${t.name}, just a friendly reminder that your rent payment for Unit ${t.unit} is due on ${t.dueDate}. We appreciate your timely payment. Thank you!`
}

export default function Messages() {
  const [activeTab, setActiveTab] = useState('arrears')
  const [selectedTenants, setSelectedTenants] = useState([])
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter tenants based on active tab
  const filteredTenants = MOCK_TENANTS.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tenant.unit.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === 'arrears') return tenant.status === 'arrears' && matchesSearch
    if (activeTab === 'paid') return tenant.status === 'paid' && matchesSearch
    if (activeTab === 'upcoming') return tenant.status === 'upcoming' && matchesSearch
    return matchesSearch
  })

  // Update message template when tab changes
  useEffect(() => {
    if (filteredTenants.length > 0) {
      setMessage(Templates[activeTab](filteredTenants[0]))
    } else {
      setMessage('')
    }
    setSelectedTenants([])
  }, [activeTab])

  const handleSelectTenant = (tenant) => {
    const exists = selectedTenants.find(t => t.id === tenant.id)
    let updatedSelection;
    
    if (exists) {
      updatedSelection = selectedTenants.filter(t => t.id !== tenant.id)
    } else {
      updatedSelection = [...selectedTenants, tenant]
    }
    
    setSelectedTenants(updatedSelection)

    // Auto-fill message for single selection
    if (updatedSelection.length === 1) {
      setMessage(Templates[activeTab](updatedSelection[0]))
    } else if (updatedSelection.length > 1) {
      setMessage(`Dear Tenant, this is a reminder regarding your rent...`) // Generic for bulk
    }
  }

  const handleSendMessage = (type) => {
    if (selectedTenants.length === 0) {
      alert('Please select at least one tenant.')
      return
    }
    
    // COMING SOON LOGIC
    console.log(`Attempting to send ${type} to:`, selectedTenants.map(t => t.phone))
    console.log('Message:', message)
    
    alert(`COMING SOON: ${type} integration is currently under development.`)
  }

  const tabs = [
    { id: 'arrears', label: 'Arrears', icon: AlertTriangle, color: '#ef4444' },
    { id: 'paid', label: 'Paid / Receipts', icon: CheckCircle, color: '#22c55e' },
    { id: 'upcoming', label: 'Reminders', icon: Clock, color: '#f59e0b' },
  ]

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1>Communication Center</h1>
        <p style={{ color: 'var(--text-subtle)' }}>Send reminders, receipts, and custom messages</p>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} style={{ color: activeTab === tab.id ? 'var(--primary-blue)' : tab.color }} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="messages-layout">
        {/* Left Column: Tenant List */}
        <div className="card tenant-list-card">
          <div style={{ padding: '1rem', borderBottom: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#2C2C2C', padding: '0.5rem', borderRadius: '6px', gap: '0.5rem' }}>
              <Search size={18} color="#B0B0B0" />
              <input 
                type="text" 
                placeholder="Search tenants..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', width: '100%' }}
              />
            </div>
          </div>

          <div className="tenant-scroll">
            {filteredTenants.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No tenants found</div>
            ) : (
              filteredTenants.map(tenant => (
                <div 
                  key={tenant.id} 
                  className={`tenant-item ${selectedTenants.find(t => t.id === tenant.id) ? 'selected' : ''}`}
                  onClick={() => handleSelectTenant(tenant)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedTenants.find(t => t.id === tenant.id)}
                      readOnly 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-blue)' }}
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0' }}>{tenant.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Unit: {tenant.unit}</span>
                    </div>
                  </div>
                  <div>
                    {tenant.status === 'arrears' && <span className="badge badge-red">KES {tenant.balance}</span>}
                    {tenant.status === 'paid' && <span className="badge badge-green">Paid</span>}
                    {tenant.status === 'upcoming' && <span className="badge badge-yellow">Due: {tenant.dueDate}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Message Editor */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
            <span>Compose Message</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 'normal' }}>
              Selected: {selectedTenants.length}
            </span>
          </h3>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Select tenants to generate a message template..."
            className="message-textarea"
            rows={8}
          />

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              className="btn btn-primary"
              onClick={() => handleSendMessage('SMS')}
              style={{ flex: 1 }}
            >
              <Send size={18} />
              Send SMS (Coming Soon)
            </button>
            
            <button 
              className="btn btn-whatsapp"
              onClick={() => handleSendMessage('WhatsApp')}
              style={{ flex: 1, background: '#25D366', color: 'white' }}
            >
              <MessageCircle size={18} />
              Send WhatsApp (Coming Soon)
            </button>
          </div>
          
          <p style={{ fontSize: '0.75rem', color: '#555', marginTop: '1.5rem', textAlign: 'center' }}>
            * This feature is coming soon. Messaging integration is under development.
          </p>
        </div>
      </div>
    </div>
  )
}