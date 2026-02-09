import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Receipt, CreditCard, Banknote, CheckCircle, Search, RefreshCw } from 'lucide-react';

const CashierDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, PAID

  //New part for currency symbol
  
    const [currency, setCurrency] = useState(localStorage.getItem('currency') || '$');
  
    useEffect(() => {
      // 1. Create a function to check storage and update state
      const checkCurrency = () => {
        setCurrency(localStorage.getItem('currency') || '$');
      };
  
      // 2. Listen for the 'storage' event (the "shout" from AdminOverview)
      window.addEventListener('storage', checkCurrency);
  
      // 3. Cleanup listener when component unmounts
      return () => {
        window.removeEventListener('storage', checkCurrency);
      };
    }, []);
  

  // 1. Define the fetch function safely
  const fetchOrders = async () => {
    try {
      setLoading(true);
      // NOTICE THE 'await' keyword here! This fixes your error.
      const data = await db.getOrders();
      
      // Safety check: Ensure data is an array before setting it
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Call it when component mounts
  useEffect(() => {
    fetchOrders();
  }, []);

  // 3. Handle Filtering
  const filteredOrders = orders.filter(order => {
    if (filter === 'ALL') return true;
    return order.status === filter;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Billing & Transactions</h2>
        <button 
          onClick={fetchOrders} 
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">Pending Payments</h3>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Receipt size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {orders.filter(o => o.status === 'READY').length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">Today's Revenue</h3>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Banknote size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {currency}{orders
              .filter(o => o.status === 'PAID')
              .reduce((sum, o) => sum + Number(o.total), 0)
              .toFixed(2)}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            All Orders
          </button>
          <button 
            onClick={() => setFilter('READY')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'READY' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            To Pay
          </button>
          <button 
            onClick={() => setFilter('PAID')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'PAID' ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Completed
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Table</th>
                <th className="p-4">Waiter</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No orders found</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono">#{order.id}</td>
                    <td className="p-4 font-bold">{order.table_number}</td>
                    <td className="p-4">{order.waiter_name || 'N/A'}</td>
                    <td className="p-4 font-bold text-slate-800">{currency}{Number(order.total).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        order.status === 'READY' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {order.status !== 'PAID' && (
                        <button 
                          onClick={async () => {
                            await db.updateOrderStatus(order.id, 'PAID');
                            fetchOrders();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-bold"
                        >
                          <CheckCircle size={14} /> Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;