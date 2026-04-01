import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      
      // 1. GET THE LOGGED IN USER
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        setTenants([])
        setLoading(false)
        return
      }

      // 2. FETCH TENANTS FILTERED BY USER ID
      // We traverse the relationship: tenants -> units -> properties -> user_id
      // We use !inner on units and properties to ensure we only get tenants that 
      // successfully link back to a property owned by this user.
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          units!inner (
            unit_number,
            rent_amount,
            properties!inner ( name, user_id ) 
          ),
          payments ( amount )
        `)
        .eq('units.properties.user_id', user.id) // <--- ISOLATION: Filter by the logged-in user's ID
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map through tenants to calculate balance dynamically
      const tenantsWithBalance = (data || []).map(t => {
        const totalRent = t.units?.rent_amount || 0
        const totalPaid = t.payments ? t.payments.reduce((sum, p) => sum + p.amount, 0) : 0
        
        // Balance = (Paid) - (Rent)
        // Positive = Credit (Overpaid), Negative = Arrears (Owed)
        const balance = totalPaid - totalRent
        
        return {
          ...t,
          balance: balance
        }
      })

      setTenants(tenantsWithBalance)
    } catch (error) {
      alert('Error fetching tenants: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3>Tenants Directory</h3>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>Manage occupant details and balances</p>
      </div>

      <div className="data-table">
        {loading ? (
          <p style={{padding:'20px', textAlign:'center'}}>Loading tenants...</p>
        ) : tenants.length === 0 ? (
          <div style={{padding:'40px', textAlign:'center', color:'#666'}}>
            No tenants found. Add some via Units page.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name & Phone</th>
                <th>Unit / Property</th>
                <th>Balance (Arrears)</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong style={{color:'#fff', fontWeight:'600'}}>{t.name}</strong>
                    <div style={{fontSize:'0.8rem', color:'#999'}}>{t.phone}</div>
                  </td>
                  
                  <td>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      <span style={{fontWeight:'bold', color:'#fff'}}>{t.units?.unit_number}</span>
                      <small style={{color:'#999'}}>{t.units?.properties?.name}</small>
                    </div>
                  </td>

                  <td>
                    <span style={{ 
                      color: t.balance >= 0 ? '#2ECC71' : '#ef4444', 
                      fontWeight: '700' 
                    }}>
                      {t.balance > 0 ? `+KES ${t.balance.toLocaleString()}` : `KES ${t.balance.toLocaleString()}`}
                    </span>
                    {t.balance === 0 && <span style={{ marginLeft: '8px', color: '#2ECC71', fontWeight:'700' }}>(Cleared)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}