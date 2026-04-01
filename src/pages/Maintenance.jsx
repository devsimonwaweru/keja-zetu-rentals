import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, AlertCircle, Clock, CheckCircle, Wrench } from 'lucide-react'

export default function Maintenance() {
  const [requests, setRequests] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  // Form State
  const [formUnitId, setFormUnitId] = useState('')
  const [formDescription, setFormDescription] = useState('')

  useEffect(() => {
    fetchRequests()
    fetchUnits()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          units (
            unit_number,
            properties ( name ),
            tenants ( name, phone )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data)
    } catch (error) {
      alert('Error fetching maintenance: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnits = async () => {
    const { data } = await supabase.from('units').select('id, unit_number').order('unit_number')
    if (data) setUnits(data)
  }

  const handleAddRequest = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('maintenance_requests').insert([
        {
          unit_id: parseInt(formUnitId),
          description: formDescription,
          status: 'pending'
        }
      ])

      if (error) throw error
      
      setShowModal(false)
      setFormUnitId('')
      setFormDescription('')
      fetchRequests()
    } catch (error) {
      alert('Error adding request: ' + error.message)
    }
  }

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      fetchRequests()
    } catch (error) {
      alert('Error updating status: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="status-badge" style={{background: '#f1c40f', color: '#000'}}>PENDING</span>
      case 'in_progress': return <span className="status-badge" style={{background: '#3498db', color: '#fff'}}>IN PROGRESS</span>
      case 'completed': return <span className="status-badge" style={{background: '#2ECC71', color: '#000'}}>COMPLETED</span>
      default: return <span className="status-badge">{status}</span>
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3>Maintenance Requests</h3>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>Track repairs and property issues</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Request
        </button>
      </div>

      {/* Cards View (Better for maintenance than table) */}
      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <div className="stat-card" style={{ textAlign: 'center', padding: '48px' }}>
          <Wrench size={48} style={{ color: '#333', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-subtle)', marginBottom: '8px' }}>No maintenance issues</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {requests.map((req) => (
            <div key={req.id} className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                  {new Date(req.created_at).toLocaleDateString()}
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div style={{ marginBottom: '12px', fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>
                {req.units?.properties?.name} - Unit {req.units?.unit_number}
              </div>

              {req.units?.tenants && (
                <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                  Tenant: {req.units.tenants.name}
                </div>
              )}

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', flexGrow: 1, color: '#ddd', fontSize: '0.9rem' }}>
                "{req.description}"
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #333', display: 'flex', gap: '8px' }}>
                {req.status !== 'completed' && (
                  <>
                    {req.status === 'pending' && (
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => updateStatus(req.id, 'in_progress')}
                      >
                        Start Work
                      </button>
                    )}
                    {req.status === 'in_progress' && (
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => updateStatus(req.id, 'completed')}
                        style={{ background: '#2ECC71', color: '#000' }}
                      >
                        <CheckCircle size={14} /> Mark Done
                      </button>
                    )}
                  </>
                )}
                {req.status === 'completed' && (
                  <span style={{ color: '#2ECC71', fontSize: '0.9rem', fontWeight: '600', marginLeft: 'auto' }}>
                    Resolved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- NEW REQUEST MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Log Maintenance Issue</h3>
            <form onSubmit={handleAddRequest}>
              <div className="input-group">
                <label>Unit</label>
                <select 
                  value={formUnitId} 
                  onChange={(e) => setFormUnitId(e.target.value)}
                  required
                >
                  <option value="">Select Unit</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.unit_number}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Issue Description</label>
                <textarea 
                  rows="4"
                  placeholder="e.g. Leaking faucet in kitchen..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  style={{ width: '100%', background: '#2C2C2C', border: '1px solid #444', borderRadius: '8px', color: '#fff', padding: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}