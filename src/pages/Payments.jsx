import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Receipt, Download, Building2, Search, X } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]); 
  const [tenantsInSelectedProperty, setTenantsInSelectedProperty] = useState([]); 
  
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantSearchQuery, setTenantSearchQuery] = useState(''); // New state for search
  
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('Cash');

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');

      const { data: props } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      
      setProperties(props || []);

      const propertyIds = props.map(p => p.id);
      if (propertyIds.length > 0) {
        const { data: units } = await supabase
          .from('units')
          .select('id, unit_number, property_id, properties (name)')
          .in('property_id', propertyIds);

        const unitIds = units.map(u => u.id);

        if (unitIds.length > 0) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('id, name, phone, unit_id, payments(*)')
            .in('unit_id', unitIds);

          const paymentsWithInfo = (tenantData || []).flatMap(t => {
            const unitInfo = units.find(u => u.id === t.unit_id);
            return (t.payments || []).map(p => ({
              ...p,
              tenant: {
                ...t,
                unit_number: unitInfo?.unit_number || 'N/A',
                property_name: unitInfo?.properties?.name || 'Unknown'
              }
            }));
          }).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

          setPayments(paymentsWithInfo);
        }
      }

    } catch (err) {
      console.error(err);
      alert('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Handle Property Selection
  const handlePropertyChange = async (e) => {
    const propId = e.target.value;
    setSelectedPropertyId(propId);
    
    // Reset Tenant Selection & Search
    setSelectedTenant(null);
    setTenantSearchQuery('');
    setTenantsInSelectedProperty([]);

    if (!propId) return;

    try {
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('property_id', propId);

      if (!units || units.length === 0) return;

      const unitIds = units.map(u => u.id);

      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, phone, units!inner(unit_number)')
        .in('unit_id', unitIds);

      setTenantsInSelectedProperty(tenants || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  // 2. Handle Tenant Search Selection
  const handleTenantSelect = (tenant) => {
    setSelectedTenant(tenant);
    setTenantSearchQuery(`${tenant.name} (Unit ${tenant.units?.unit_number})`);
  };

  const clearTenantSelection = () => {
    setSelectedTenant(null);
    setTenantSearchQuery('');
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedTenant || !formAmount) return alert('Please select a tenant and enter an amount');

    try {
      const amount = parseFloat(formAmount);

      const { error } = await supabase.from('payments').insert([
        { 
          tenant_id: selectedTenant.id, 
          amount, 
          method: formMethod, 
          payment_date: new Date().toISOString() 
        }
      ]);

      if (error) throw error;

      setShowRecordModal(false);
      setSelectedPropertyId('');
      setTenantsInSelectedProperty([]);
      setSelectedTenant(null);
      setTenantSearchQuery('');
      setFormAmount('');
      setFormMethod('Cash');

      fetchInitialData(); 
      alert('Payment recorded successfully!');
    } catch (err) {
      console.error(err);
      alert('Error recording payment: ' + err.message);
    }
  };

  const openReceipt = (payment) => {
    setSelectedReceipt(payment);
    setShowReceiptModal(true);
  };

  // Filter logic for the search
  const filteredTenants = tenantsInSelectedProperty.filter(t => {
    const search = tenantSearchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(search) ||
      t.phone.includes(search) ||
      (t.units?.unit_number || '').toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3>Rent Collection</h3>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>Payment history and recording</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRecordModal(true)}>
          <Receipt size={18} style={{ marginRight: '8px' }} /> Record Payment
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Loading data...</p>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No payments recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tenant / Unit / Property</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#fff' }}>{p.tenant?.name}</div>
                    <small style={{ color: '#999' }}>
                      Unit {p.tenant?.unit_number} | {p.tenant?.property_name}
                    </small>
                  </td>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary-green)' }}>
                    KES {p.amount.toLocaleString()}
                  </td>
                  <td>{p.method}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => openReceipt(p)}>
                      <Receipt size={14} /> Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- RECORD PAYMENT MODAL --- */}
      {showRecordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Record New Payment</h3>
            
            {/* STEP 1: PROPERTY */}
            <div className="input-group">
              <label>1. Select Property</label>
              <div style={{ position: 'relative' }}>
                 <Building2 size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#666' }} />
                <select
                  style={{ paddingLeft: '36px' }}
                  value={selectedPropertyId}
                  onChange={handlePropertyChange}
                >
                  <option value="">-- Choose Property --</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STEP 2: SEARCH TENANT */}
            <div className="input-group" style={{ marginTop: '16px', position: 'relative', zIndex: 10 }}>
              <label>2. Search Tenant</label>
              
              {selectedTenant ? (
                // VIEW SELECTED TENANT
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#252525', borderRadius: '8px', border: '1px solid var(--primary-green)' }}>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{selectedTenant.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#999' }}>
                      Unit {selectedTenant.units?.unit_number} • {selectedTenant.phone}
                    </div>
                  </div>
                  <button 
                    onClick={clearTenantSelection}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                // SEARCH INPUT
                <>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#666' }} />
                    <input
                      type="text"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Search name, phone, or unit..."
                      value={tenantSearchQuery}
                      onChange={(e) => setTenantSearchQuery(e.target.value)}
                      disabled={!selectedPropertyId}
                    />
                  </div>

                  {/* SUGGESTIONS LIST */}
                  {tenantSearchQuery && selectedPropertyId && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 20,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}>
                      {filteredTenants.length > 0 ? (
                        filteredTenants.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleTenantSelect(t)}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #333',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontWeight: '500', color: '#fff' }}>{t.name}</span>
                            <span style={{ fontSize: '0.85rem', color: '#999' }}>
                              Unit {t.units?.unit_number}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '12px', color: '#666', textAlign: 'center' }}>
                          No tenants found matching "{tenantSearchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* STEP 3: AMOUNT & METHOD */}
            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Amount (KES)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={formAmount} 
                onChange={(e) => setFormAmount(e.target.value)} 
                disabled={!selectedTenant}
              />
            </div>

            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Payment Method</label>
              <select value={formMethod} onChange={(e) => setFormMethod(e.target.value)} disabled={!selectedTenant}>
                <option>Cash</option>
                <option>M-Pesa</option>
                <option>Bank Transfer</option>
                <option>Card</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-outline" onClick={() => {
                setShowRecordModal(false);
                setSelectedTenant(null);
                setTenantSearchQuery('');
              }}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handleRecordPayment}
                disabled={!selectedTenant || !formAmount}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && selectedReceipt && (
        <div className="modal-overlay">
          <div className="modal receipt">
            <div style={{textAlign:'center', marginBottom:'20px', borderBottom:'1px dashed #444', paddingBottom:'20px'}}>
              <h3 style={{margin:0, color:'#fff'}}>KEJA-ZETU</h3>
              <p style={{margin:0, color:'#999', fontSize:'0.8rem'}}>Official Rent Receipt</p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{color:'#999'}}>Date:</span>
                <span style={{color:'#fff'}}>{new Date(selectedReceipt.payment_date).toLocaleString()}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{color:'#999'}}>Tenant:</span>
                <span style={{color:'#fff', fontWeight:'bold'}}>{selectedReceipt.tenant?.name}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{color:'#999'}}>Phone:</span>
                <span style={{color:'#fff'}}>{selectedReceipt.tenant?.phone}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{color:'#999'}}>Unit:</span>
                <span style={{color:'#fff'}}>{selectedReceipt.tenant?.unit_number}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{color:'#999'}}>Property:</span>
                <span style={{color:'#fff'}}>{selectedReceipt.tenant?.property_name}</span>
              </div>
            </div>

            <div style={{background:'#252525', padding:'16px', borderRadius:'8px', marginBottom:'24px', textAlign:'center'}}>
              <div style={{fontSize:'0.9rem', color:'#999', marginBottom:'4px'}}>Amount Paid</div>
              <div style={{fontSize:'1.5rem', fontWeight:'bold', color: 'var(--primary-green)' }}>
                KES {selectedReceipt.amount.toLocaleString()}
              </div>
              <div style={{fontSize:'0.8rem', color:'#666', marginTop:'4px'}}>Method: {selectedReceipt.method}</div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{flex:1}} onClick={() => setShowReceiptModal(false)}>Close</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={() => window.print()}>
                <Download size={16} style={{marginRight:'8px'}} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}