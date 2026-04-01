import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Edit, AlertTriangle } from 'lucide-react'

export default function Units() {
  const [loading, setLoading] = useState(true)
  const [allUnits, setAllUnits] = useState([])
  const [properties, setProperties] = useState([])
  const [selectedPropId, setSelectedPropId] = useState('ALL')

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentUnit, setCurrentUnit] = useState(null)
  const [editTenantName, setEditTenantName] = useState('')
  const [editTenantPhone, setEditTenantPhone] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch properties and units with tenant info
      const [propsRes, unitsRes] = await Promise.all([
        supabase.from('properties').select('*').order('name'),
        supabase.from('units').select(`
          *,
          properties(name),
          tenants(id,name,phone)
        `).order('unit_number', { ascending: true })
      ])

      if (propsRes.data) setProperties(propsRes.data)

      // Pick first tenant for each unit (assuming 1 tenant per unit)
      if (unitsRes.data) {
        const unitsWithTenant = unitsRes.data.map(unit => ({
          ...unit,
          tenants: unit.tenants ? unit.tenants[0] : null
        }))
        setAllUnits(unitsWithTenant)
      }
    } catch (error) {
      alert('Error loading units: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter Logic
  const filteredUnits = selectedPropId === 'ALL' 
    ? allUnits 
    : allUnits.filter(u => u.property_id === parseInt(selectedPropId))

  // --- OPEN MODAL & FETCH FRESH DATA ---
  const openEditModal = async (unit) => {
    try {
      const { data: freshUnit, error } = await supabase
        .from('units')
        .select(`
          *,
          properties(name),
          tenants(id,name,phone)
        `)
        .eq('id', unit.id)
        .single()

      if (error) {
        console.error("Error fetching fresh unit data:", error)
        setCurrentUnit(unit)
      } else {
        setCurrentUnit({
          ...freshUnit,
          tenants: freshUnit.tenants ? freshUnit.tenants[0] : null
        })
      }

      // Populate tenant form
      const tenant = freshUnit.tenants ? freshUnit.tenants[0] : null
      setEditTenantName(tenant?.name || '')
      setEditTenantPhone(tenant?.phone || '')

      setShowEditModal(true)
    } catch (error) {
      alert('Error opening edit: ' + error.message)
    }
  }

  const handleUpdateTenant = async (e) => {
    e.preventDefault()
    try {
      if (currentUnit.tenants && currentUnit.tenants.id) {
        // Update Existing Tenant
        const { error } = await supabase
          .from('tenants')
          .update({ name: editTenantName, phone: editTenantPhone })
          .eq('id', currentUnit.tenants.id)
        if (error) throw error
      } else {
        // Create New Tenant
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert([
            { name: editTenantName, phone: editTenantPhone, unit_id: currentUnit.id, balance: 0 }
          ])
          .select()
          .single()

        if (tenantError) throw tenantError

        // Update Unit to Occupied
        const { error: unitError } = await supabase
          .from('units')
          .update({ status: 'occupied' })
          .eq('id', currentUnit.id)

        if (unitError) throw unitError

        // Update state so modal shows new tenant immediately
        setCurrentUnit(prev => ({ ...prev, tenants: newTenant, status: 'occupied' }))
      }

      setShowEditModal(false)
      fetchData()
    } catch (error) {
      alert('Error updating: ' + error.message)
    }
  }

  const handleVacateTenant = async () => {
    if (!currentUnit?.tenants?.id) {
      alert("System Error: Could not find Tenant ID. Please refresh the page.")
      return
    }

    if (!confirm(
      `Are you sure you want to vacate Unit ${currentUnit.unit_number}?\n\n` +
      `This will DELETE tenant (${currentUnit.tenants.name}) info and label unit as VACANT.`
    )) return

    try {
      // Delete Tenant
      const { error: deleteError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', currentUnit.tenants.id)

      if (deleteError) throw deleteError

      // Update Unit to Vacant
      const { error: updateError } = await supabase
        .from('units')
        .update({ status: 'vacant' })
        .eq('id', currentUnit.id)

      if (updateError) throw updateError

      setShowEditModal(false)
      fetchData()
      alert(`Unit ${currentUnit.unit_number} is now Vacant.`)
    } catch (error) {
      alert('Error vacating unit: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    const color = status === 'occupied' ? '#2ECC71' : '#ef4444'
    const bg = status === 'occupied' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(239, 68, 68, 0.2)'
    return (
      <span style={{
        background: bg, 
        color: color, 
        padding: '4px 10px', 
        borderRadius: '20px', 
        fontSize: '0.75rem', 
        fontWeight: '700'
      }}>
        {status.toUpperCase()}
      </span>
    )
  }

  return (
    <div>
      {/* Header & Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <h3>Units List</h3>
          <select 
            value={selectedPropId} 
            onChange={(e) => setSelectedPropId(e.target.value)}
            style={{ minWidth: '200px', maxWidth: '300px', height:'40px' }}
          >
            <option value="ALL">All Properties</option>
            {properties.map(prop => (
              <option key={prop.id} value={prop.id}>{prop.name}</option>
            ))}
          </select>
        </div>
        <div style={{background:'#252525', padding:'8px 16px', borderRadius:'8px', fontSize:'0.9rem', color:'#ccc'}}>
          {filteredUnits.length} Units Found
        </div>
      </div>

      {/* Units Table */}
      <div className="data-table">
        {loading ? (
          <p style={{padding:'20px', textAlign:'center'}}>Loading units...</p>
        ) : filteredUnits.length === 0 ? (
          <div style={{padding:'40px', textAlign:'center', color:'#666'}}>
            No units found for this property.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Unit Number</th>
                <th>Property</th>
                <th>Rent</th>
                <th>Status</th>
                <th>Tenant Details</th>
                <th style={{textAlign:'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <span style={{fontWeight:'700', fontSize:'1.1rem', color:'#fff'}}>
                      {unit.unit_number}
                    </span>
                  </td>
                  <td style={{color:'var(--text-subtle)', fontSize:'0.9rem'}}>
                    {unit.properties?.name}
                  </td>
                  <td style={{color:'#fff', fontWeight:'600'}}>
                    KES {unit.rent_amount.toLocaleString()}
                  </td>
                  <td>{getStatusBadge(unit.status)}</td>
                  <td>
                    {unit.tenants ? (
                      <span style={{ color: '#fff', fontWeight: '600', fontSize: '1rem' }}>
                        {unit.tenants.name}
                      </span>
                    ) : (
                      <span style={{color:'#666', fontStyle:'italic', opacity:0.7}}>N/A</span>
                    )}
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => openEditModal(unit)}
                    >
                      <Edit size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Tenant Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{marginBottom:'4px'}}>Edit Unit {currentUnit?.unit_number}</h3>
            <p style={{color:'var(--text-subtle)', fontSize:'0.9rem', marginBottom:'24px'}}>
              {currentUnit?.tenants ? 'Update tenant information' : 'Assign a tenant to this unit'}
            </p>

            <form onSubmit={handleUpdateTenant}>
              <div className="input-group">
                <label>Tenant Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  value={editTenantName} 
                  onChange={(e) => setEditTenantName(e.target.value)} 
                  required
                />
              </div>

              <div className="input-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="07..." 
                  value={editTenantPhone} 
                  onChange={(e) => setEditTenantPhone(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Details</button>
              </div>
            </form>

            {currentUnit?.tenants && (
              <div style={{marginTop:'24px', borderTop:'1px solid #333', paddingTop:'24px'}}>
                <p style={{color:'#ef4444', fontSize:'0.85rem', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px'}}>
                  <AlertTriangle size={14} /> Removing tenant will delete their info and mark unit as vacant.
                </p>
                <button 
                  className="btn" 
                  style={{width:'100%', background:'transparent', border:'2px solid #ef4444', color:'#ef4444', fontWeight:'600'}}
                  onClick={handleVacateTenant}
                >
                  Vacate / Delete Tenant
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
