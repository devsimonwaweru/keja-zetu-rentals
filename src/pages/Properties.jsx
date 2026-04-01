 
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Plus, MapPin, Building2, Users, Edit, Trash2, X, DollarSign } from 'lucide-react'

export default function Properties() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentProp, setCurrentProp] = useState(null)
  const [propUnits, setPropUnits] = useState([])

  // Add Property Form State
  const [addName, setAddName] = useState('')
  const [addLoc, setAddLoc] = useState('')
  const [draftUnits, setDraftUnits] = useState([]) 

  // Edit Property Form State
  const [editName, setEditName] = useState('')
  const [editLoc, setEditLoc] = useState('')

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      
      // 1. GET THE LOGGED IN USER
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        // Handle case where no user is logged in (optional: redirect to login)
        console.log("No user logged in")
        setProperties([])
        setLoading(false)
        return
      }

      // 2. FETCH PROPERTIES FILTERED BY USER ID
      // .eq('user_id', user.id) is the key to isolating data
      const { data, error } = await supabase
        .from('properties')
        .select(`*, units (id, status, rent_amount), tenants (id, name, phone)`) 
        .eq('user_id', user.id) // <--- ISOLATION: Only fetch this user's properties
        .order('created_at', { ascending: false })

      if (error) throw error
      setProperties(data)
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- DRAFT UNIT LOGIC ---
  const addDraftUnit = () => {
    setDraftUnits([...draftUnits, { 
      id: Date.now(),
      number: '', 
      status: 'vacant', 
      rent: 0,
      tenantName: '', 
      tenantPhone: '' 
    }])
  }

  const updateDraftUnit = (index, field, value) => {
    const updated = [...draftUnits]
    updated[index][field] = value
    setDraftUnits(updated)
  }

  const removeDraftUnit = (index) => {
    setDraftUnits(draftUnits.filter((_, i) => i !== index))
  }

  const handleAddProperty = async (e) => {
    e.preventDefault()
    try {
      if (draftUnits.length === 0) return alert('Please add at least one unit.')
      
      // Get current user to ensure the property is linked to them
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("You must be logged in to create a property.")
      
      // 1. Create Property
      const { data: propData, error: propError } = await supabase.from('properties').insert([
        { name: addName, location: addLoc, user_id: user.id } // <--- ISOLATION: Link new property to user
      ]).select().single()

      if (propError) throw propError
      const propertyId = propData.id

      // 2. Prepare Units & Handle Tenant Logic
      const unitsToInsert = []
      let finalTenantId // Define variable to avoid reference error

      for (let i = 0; i < draftUnits.length; i++) {
        const draft = draftUnits[i]
        let finalStatus = draft.status

        // VALIDATION: If Occupied but no details, force Vacant
        if (draft.status === 'occupied' && (!draft.tenantName || !draft.tenantPhone)) {
            alert(`Unit ${draft.number} is marked "Occupied" but Tenant Name/Phone is missing.\n\nSaving as Vacant. Please edit later to add tenant.`)
            finalStatus = 'vacant'
        } else if (draft.status === 'occupied') {
            // VALID INPUT: We will create a NEW tenant record
            // eslint-disable-next-line no-unused-vars
            finalTenantId = 'pending_insert_' + i
        }

        unitsToInsert.push({
            property_id: propertyId,
            unit_number: draft.number,
            rent_amount: parseInt(draft.rent) || 0,
            status: finalStatus 
        })
      }

      // 3. Create Units
      const { data: createdUnits, error: unitError } = await supabase.from('units').insert(unitsToInsert).select()

      if (unitError) throw unitError

      // 4. Create New Tenants & Link
      for (let i = 0; i < draftUnits.length; i++) {
        const draft = draftUnits[i]
        const unitId = createdUnits[i].id

        if (draft.status === 'occupied' && draft.tenantName && draft.tenantPhone) {
            // INSERT NEW TENANT
            const { data: newTenant, error: tenantError } = await supabase.from('tenants').insert([
              { 
                  name: draft.tenantName, 
                  phone: draft.tenantPhone, 
                  unit_id: unitId, 
                  balance: 0 
                }
            ]).select().single()

            if (tenantError) throw tenantError

            // Update Unit to Occupied
            await supabase.from('units').update({ 
              status: 'occupied', 
              tenant_id: newTenant.id 
            }).eq('id', unitId)
        }
      }

      setShowAddModal(false)
      resetAddForm()
      fetchProperties()
      alert('Property added successfully!')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const resetAddForm = () => {
    setAddName('')
    setAddLoc('')
    setDraftUnits([])
  }

  // --- EDIT PROPERTY LOGIC ---
  const openEditModal = async (prop) => {
    setCurrentProp(prop)
    setEditName(prop.name)
    setEditLoc(prop.location)
    setShowEditModal(true)
    const { data: units } = await supabase.from('units').select('*').eq('property_id', prop.id)
    setPropUnits(units || [])
  }

  const handleUpdateProperty = async (e) => {
    e.preventDefault()
    try {
      // SECURITY CHECK: Ensure we are only updating a property that belongs to the user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('properties').update({ 
        name: editName, location: editLoc 
      }).eq('id', currentProp.id)
       .eq('user_id', user.id) // <--- ISOLATION: Only update if it belongs to this user

      if (error) throw error
      setShowEditModal(false)
      fetchProperties()
      alert('Property details updated!')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const deleteUnit = async (unitId) => {
    if (!confirm('Delete this unit? This cannot be undone.')) return

    try {
      // Note: Units don't have user_id, but they belong to a property. 
      // Since we fetched units via a property the user owns, this is generally safe, 
      // provided RLS is set up on the backend or property_id check is performed here.
      const { error } = await supabase.from('units').delete().eq('id', unitId)
      if (error) throw error
      
      setPropUnits(propUnits.filter(u => u.id !== unitId))
      fetchProperties() 
    } catch (error) {
      alert('Error deleting unit: ' + error.message)
    }
  }

  const calculateStats = (units) => {
    const totalUnits = units.length
    const occupiedUnits = units.filter(u => u.status === 'occupied').length
    const totalRent = units.reduce((sum, u) => sum + (parseInt(u.rent_amount) || 0), 0)
    const totalArrears = units.reduce((sum, u) => {
        return sum + (u.status === 'occupied' ? 0 : 10000) // Placeholder logic
    }, 0)

    return { totalUnits, occupiedUnits, totalRent, totalArrears }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3>My Properties</h3>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>Manage buildings, units, and tenants</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Property
        </button>
      </div>

      {loading ? <p>Loading...</p> : properties.length === 0 ? (
        <div className="stat-card" style={{ textAlign: 'center', padding: '48px' }}>
          <Building2 size={48} style={{ color: '#333', marginBottom: '16px' }} />
          <h3>No properties yet</h3>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{marginTop:'16px'}}>Add Property</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {properties.map((prop) => {
            const stats = calculateStats(prop.units || [])
            return (
              <div key={prop.id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px' }}>{prop.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
                        <MapPin size={14} style={{ marginRight: '6px' }} /> {prop.location}
                      </div>
                    </div>
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ border: 'none', color: 'var(--text-subtle)' }}
                      onClick={() => openEditModal(prop)}
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div className="stat-label">Total Units</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff' }}>{stats.totalUnits}</div>
                  </div>
                  <div>
                    <div className="stat-label">Occupied</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary-green)' }}>{stats.occupiedUnits}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                    <div className="stat-label">Exp. Rent</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-gold)' }}>KES {stats.totalRent.toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #333' }}>
                   <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/units')}>
                     Manage Units
                   </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* --- ADD PROPERTY MODAL --- */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:'700px', maxHeight:'90vh', display:'flex', flexDirection:'column'}}>
            <h3>Add New Property</h3>
            
            <div style={{marginTop:'16px', overflowY:'auto', flexGrow:1, paddingBottom:'20px'}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <div className="input-group">
                  <label>Property Name</label>
                  <input type="text" placeholder="e.g. Sunset" value={addName} onChange={e => setAddName(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Location</label>
                  <input type="text" placeholder="e.g. Kilimani" value={addLoc} onChange={e => setAddLoc(e.target.value)} required />
                </div>
              </div>

              <div style={{margin:'20px 0', borderBottom:'1px solid #333', paddingBottom:'10px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <h4 style={{color:'#fff', fontSize:'1rem'}}>Units</h4>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addDraftUnit}>
                    <Plus size={16} /> Add Unit
                  </button>
                </div>
              </div>

              {/* DRAFT UNITS LIST */}
              {draftUnits.map((u, idx) => (
                <div key={u.id} style={{background:'#252525', padding:'16px', borderRadius:'8px', marginBottom:'12px', border:'1px solid #333'}}>
                  
                  <div style={{display:'grid', gridTemplateColumns:'2fr 1fr auto', gap:'12px', alignItems:'center'}}>
                    <input 
                      type="text" 
                      placeholder="Unit # (e.g A1)" 
                      value={u.number} 
                      onChange={e => updateDraftUnit(idx, 'number', e.target.value)}
                      style={{margin:0}}
                      required
                    />
                    
                    <div style={{position:'relative'}}>
                      <DollarSign size={14} style={{position:'absolute', left:'10px', top:'14px', color:'#666'}} />
                      <input 
                        type="number" 
                        placeholder="Rent" 
                        value={u.rent || ''} 
                        onChange={e => updateDraftUnit(idx, 'rent', e.target.value)}
                        style={{margin:0, paddingLeft:'32px'}}
                      />
                    </div>
                    
                    <select 
                      value={u.status}
                      onChange={e => updateDraftUnit(idx, 'status', e.target.value)}
                      style={{margin:0}}
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                    </select>

                    <button type="button" onClick={() => removeDraftUnit(idx)} style={{background:'transparent', border:'none', color:'#ef4444', cursor:'pointer'}}>
                      <X size={18} />
                    </button>
                  </div>

                  {u.status === 'occupied' && (
                    <div style={{marginTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                      <input 
                        type="text" 
                        placeholder="Tenant Name (New)" 
                        value={u.tenantName} 
                        onChange={e => updateDraftUnit(idx, 'tenantName', e.target.value)}
                        style={{margin:0}}
                        required
                      />
                      <input 
                        type="tel" 
                        placeholder="Phone Number (New)" 
                        value={u.tenantPhone} 
                        onChange={e => updateDraftUnit(idx, 'tenantPhone', e.target.value)}
                        style={{margin:0}}
                        required
                      />
                    </div>
                  )}
                </div>
              ))}

              {draftUnits.length === 0 && (
                <div style={{textAlign:'center', padding:'20px', color:'#666', background:'#1a1a1a', borderRadius:'8px'}}>
                  No units added. Click "Add Unit" above.
                </div>
              )}

              <form onSubmit={handleAddProperty}>
                <div style={{ display:'flex', justifyContent:'flex-end', gap: '12px', marginTop:'24px', paddingTop:'20px', borderTop:'1px solid #333'}}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Property</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PROPERTY MODAL --- */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:'600px'}}>
            <h3>Edit Property</h3>
            <form onSubmit={handleUpdateProperty} style={{marginTop:'16px', marginBottom:'24px'}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <div className="input-group">
                  <label>Property Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Location</label>
                  <input type="text" value={editLoc} onChange={e => setEditLoc(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Details</button>
              </div>
            </form>

            <div style={{borderTop:'1px solid #333', paddingTop:'16px'}}>
              <h4 style={{marginBottom:'12px'}}>Manage Units</h4>
              {propUnits.length === 0 ? <p style={{color:'#666'}}>No units.</p> : (
                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                  {propUnits.map((unit) => (
                    <div key={unit.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#252525', padding:'12px', borderRadius:'8px'}}>
                      <div>
                        <div style={{fontWeight:'bold', color:'#fff'}}>{unit.unit_number}</div>
                        <div style={{fontSize:'0.8rem', color: unit.status==='occupied'?'#2ECC71':'#ef4444'}}>
                           {unit.status.toUpperCase()}
                        </div>
                      </div>
                      <button 
                        className="btn btn-outline btn-sm" 
                        style={{borderColor:'#ef4444', color:'#ef4444', padding:'4px 8px'}}
                        onClick={() => deleteUnit(unit.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}