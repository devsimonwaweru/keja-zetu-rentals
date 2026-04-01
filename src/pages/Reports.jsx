import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Download, Users, DollarSign, AlertTriangle, Home } from 'lucide-react'

export default function Reports() {
  const [payments, setPayments] = useState([])
  const [processedTenants, setProcessedTenants] = useState([]) // Stores tenants with calculated arrears
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // 1. Get Logged In User
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // 2. Fetch Tenants linked to User's Properties (Isolation)
      // We fetch tenants, their units, and the property ownership to ensure isolation
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          id, 
          name, 
          created_at,
          units!inner (
            rent_amount, 
            unit_number,
            properties!inner ( user_id )
          )
        `)
        .eq('units.properties.user_id', user.id) // <--- ISOLATION

      if (tenantError) throw tenantError

      // 3. Fetch Payments for these specific tenants
      const tenantIds = tenants.map(t => t.id)
      let paymentsData = []
      
      if (tenantIds.length > 0) {
        const { data: p } = await supabase
          .from('payments')
          .select('amount, payment_date, tenant_id')
          .in('tenant_id', tenantIds)
        
        paymentsData = p || []
      }

      setPayments(paymentsData)

      // 4. CALCULATE ARREARS & PROCESS DATA
      // Logic: Arrears = (House Rent) - (Total Paid)
      const processed = tenants.map(t => {
        const rent = t.units.rent_amount || 0
        const totalPaid = paymentsData
          .filter(p => p.tenant_id === t.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0)
        
        const arrears = rent - totalPaid

        return {
          ...t,
          rent,
          totalPaid,
          arrears
        }
      })

      setProcessedTenants(processed)

    } catch (error) {
      console.error(error)
      alert('Error generating reports: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- ANALYTICS CALCULATIONS ---
  const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  
  // Sum of all positive arrears (Money Owed)
  const totalArrears = processedTenants
    .reduce((sum, t) => sum + (t.arrears > 0 ? t.arrears : 0), 0)

  // Note: To get a real occupancy rate (Vacant vs Occupied), we would need to fetch ALL units, not just those with tenants.

  // Monthly Report Data
  const monthlyReport = payments.reduce((acc, curr) => {
    const date = new Date(curr.payment_date)
    const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' })
    
    if (!acc[monthKey]) acc[monthKey] = { count: 0, total: 0 }
    acc[monthKey].count += 1
    acc[monthKey].total += curr.amount
    return acc
  }, {})

  const monthlyTableData = Object.keys(monthlyReport).map(key => ({
    Month: key,
    Transactions: monthlyReport[key].count,
    Amount: monthlyReport[key].total
  })).reverse()

  // Export Function
  const downloadCSV = (data, filename) => {
    if (data.length === 0) return alert("No data to export")
    const headers = Object.keys(data[0]).join(",")
    const rows = data.map(obj => Object.values(obj).join(",")).join("\n")
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3>Reports & Analytics</h3>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>Business overview and financial summaries</p>
        </div>
        <button className="btn btn-outline" onClick={() => fetchAllData()}>
          Refresh Data
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
        <div>
          {/* --- SECTION 1: KEY METRICS --- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="stat-card">
              <div className="stat-label"><DollarSign size={14} style={{display:'inline', marginRight:'4px'}}/> Total Income</div>
              <div className="stat-value" style={{color:'var(--primary-green)'}}>KES {totalIncome.toLocaleString()}</div>
            </div>

            <div className="stat-card gold-accent">
              <div className="stat-label"><Users size={14} style={{display:'inline', marginRight:'4px'}}/> Active Tenants</div>
              <div className="stat-value">{processedTenants.length}</div>
              <div style={{fontSize:'0.8rem', color:'#666', marginTop:'4px'}}>
                Currently Occupied Units
              </div>
            </div>

            <div className="stat-card danger">
              <div className="stat-label"><AlertTriangle size={14} style={{display:'inline', marginRight:'4px'}}/> Total Arrears</div>
              <div className="stat-value" style={{color:'#ef4444'}}>KES {totalArrears.toLocaleString()}</div>
              <div style={{fontSize:'0.8rem', color:'#666', marginTop:'4px'}}>
                Rent - Paid
              </div>
            </div>
          </div>

          {/* --- SECTION 2: MONTHLY COLLECTION REPORT --- */}
          <div className="stat-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4>Monthly Collection Report</h4>
              <button className="btn btn-outline btn-sm" onClick={() => downloadCSV(monthlyTableData, 'kejazetu_monthly_report.csv')}>
                <Download size={14} /> Export CSV
              </button>
            </div>
            
            <div className="data-table" style={{ padding: 0, border: '1px solid #333' }}>
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Transactions</th>
                    <th>Collected (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTableData.length > 0 ? monthlyTableData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{fontWeight:600}}>{row.Month}</td>
                      <td>{row.Transactions}</td>
                      <td style={{color:'var(--primary-green)', fontWeight:'700'}}>KES {row.Amount.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" style={{textAlign:'center', color:'#666'}}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- SECTION 3: ARREARS REPORT --- */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4>Rent Arrears Report</h4>
              <button className="btn btn-outline btn-sm" onClick={() => {
                 const debtors = processedTenants
                    .map(t => ({ 
                      Name: t.name, 
                      Unit: t.units?.unit_number || 'N/A', 
                      Rent: t.rent,
                      Paid: t.totalPaid,
                      Arrears: t.arrears > 0 ? t.arrears : 0 
                    }))
                 downloadCSV(debtors, 'keja_zetu_arrears_report.csv')
              }}>
                <Download size={14} /> Export CSV
              </button>
            </div>
            
            <div className="data-table" style={{ padding: 0, border: '1px solid #333' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Unit</th>
                    <th>House Rent</th>
                    <th>Total Paid</th>
                    <th>Arrears (Balance)</th>
                  </tr>
                </thead>
                <tbody>
                  {processedTenants.length > 0 ? processedTenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.name}</strong>
                      </td>
                      <td>{t.units?.unit_number}</td>
                      <td>KES {t.rent.toLocaleString()}</td>
                      <td style={{color: 'var(--primary-green)'}}>KES {t.totalPaid.toLocaleString()}</td>
                      <td style={{
                        color: t.arrears > 0 ? '#ef4444' : '#2ECC71', 
                        fontWeight:'700'
                      }}>
                        {t.arrears > 0 ? `KES ${t.arrears.toLocaleString()}` : `KES 0 (Credit: ${Math.abs(t.arrears).toLocaleString()})`}
                      </td>
                    </tr>
                  )) : (
                     <tr><td colSpan="5" style={{textAlign:'center', color:'#666'}}>No tenant data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}