import React, { useEffect, useState, useCallback } from 'react';
import { usePurchaseStore } from '../store/usePurchaseStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, Plus, FileText, Check, Clock, X, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

export function PurchaseOrders() {
  const { purchaseOrders, suppliers, isLoading, fetchPurchaseOrders, fetchSuppliers, createPurchaseOrder, updatePOStatus } = usePurchaseStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // New PO State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<{product_id: string, quantity: number, unit_price: number}[]>([]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id, name, unit').eq('is_active', true);
    if (data) setProducts(data);
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchProducts();
  }, [fetchPurchaseOrders, fetchSuppliers, fetchProducts]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleAddItem = () => {
    setPoItems([...poItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...poItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setPoItems(newItems);
  };

  const removeItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || poItems.length === 0) return;
    
    // Filter out invalid items
    const validItems = poItems.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) return;

    await createPurchaseOrder({ supplier_id: selectedSupplier, notes }, validItems);
    
    setIsModalOpen(false);
    setSelectedSupplier('');
    setNotes('');
    setPoItems([]);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Received': return 'bg-green-100 text-green-700';
      case 'Pending': return 'bg-blue-100 text-blue-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600'; // Draft
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Received': return <Check className="w-3 h-3" />;
      case 'Pending': return <Clock className="w-3 h-3" />;
      case 'Cancelled': return <X className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-purple-600" />
            Purchase Orders
          </h1>
          <p className="text-slate-500 text-sm">Create and track orders to your suppliers</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Create PO
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading orders...</div>
        ) : purchaseOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Purchase Orders</h3>
            <p className="text-slate-500 mb-6">Create your first PO to restock inventory.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create First PO
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold">PO Number</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Supplier</th>
                  <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((po) => {
                  const isExpanded = expandedRows.has(po.id);
                  return (
                    <React.Fragment key={po.id}>
                      <tr 
                        onClick={() => toggleRow(po.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                            {po.po_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {dayjs(po.created_at).format('MMM D, YYYY')}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                          {po.suppliers?.name || 'Unknown Supplier'}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-slate-900 text-right">
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                            getStatusColor(po.status)
                          )}>
                            {getStatusIcon(po.status)}
                            {po.status}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded Row Content */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={5} className="px-6 py-4 border-l-4 border-l-purple-500">
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col gap-4">
                              
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Items</h4>
                                  <div className="space-y-1">
                                    {po.items?.map(item => (
                                      <div key={item.id} className="flex items-center gap-3 text-sm">
                                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{item.quantity} {item.products?.unit}</span>
                                        <span className="font-medium text-slate-700 w-48">{item.products?.name}</span>
                                        <span className="text-slate-400">@ {formatCurrency(item.unit_price)}</span>
                                        <span className="font-bold text-slate-900 ml-4">{formatCurrency(item.total_price)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Actions based on status */}
                                {po.status === 'Draft' && (
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); updatePOStatus(po.id, 'Pending'); }}
                                      className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
                                    >
                                      Submit Order
                                    </button>
                                  </div>
                                )}
                                {po.status === 'Pending' && (
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); updatePOStatus(po.id, 'Received'); }}
                                      className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700"
                                    >
                                      Mark as Received
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); updatePOStatus(po.id, 'Cancelled'); }}
                                      className="bg-slate-200 text-slate-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-slate-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {po.notes && (
                                <div className="mt-2 text-sm text-slate-600 bg-slate-100 p-3 rounded-md">
                                  <span className="font-semibold text-slate-700 block mb-1">Notes:</span>
                                  {po.notes}
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Create Purchase Order</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Supplier *</label>
                <select 
                  required
                  className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600 shadow-sm"
                  value={selectedSupplier}
                  onChange={e => setSelectedSupplier(e.target.value)}
                >
                  <option value="" disabled>-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Order Items *</label>
                  <button type="button" onClick={handleAddItem} className="text-sm text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {poItems.length === 0 && (
                    <div className="text-center text-sm text-slate-500 py-4">Click "Add Item" to add products to this order.</div>
                  )}
                  {poItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <select 
                        required
                        className="flex-1 border-slate-200 rounded-md text-sm shadow-sm"
                        value={item.product_id}
                        onChange={e => updateItem(index, 'product_id', e.target.value)}
                      >
                        <option value="" disabled>Select Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                        ))}
                      </select>
                      
                      <div className="w-24">
                        <input 
                          type="number" min="0.1" step="0.1" required placeholder="Qty"
                          className="w-full border-slate-200 rounded-md text-sm shadow-sm"
                          value={item.quantity || ''}
                          onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        />
                      </div>
                      
                      <div className="w-32 relative">
                        <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                        <input 
                          type="number" min="0" step="0.01" required placeholder="Price"
                          className="w-full pl-7 border-slate-200 rounded-md text-sm shadow-sm"
                          value={item.unit_price || ''}
                          onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                        />
                      </div>
                      
                      <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  
                  {poItems.length > 0 && (
                    <div className="text-right pt-3 mt-3 border-t border-slate-200">
                      <span className="text-sm font-semibold text-slate-500 mr-4">Total Estimate:</span>
                      <span className="text-lg font-black text-slate-800">
                        {formatCurrency(poItems.reduce((sum, item) => sum + ((item.quantity||0) * (item.unit_price||0)), 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea 
                  rows={2}
                  className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600 shadow-sm resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={poItems.length === 0 || !selectedSupplier}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
