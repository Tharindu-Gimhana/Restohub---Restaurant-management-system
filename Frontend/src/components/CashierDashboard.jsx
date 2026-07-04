import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Receipt, Banknote, CheckCircle, RefreshCw } from 'lucide-react';
import BillingDialog from './BillingDialog';

// Simplified helper: Just standardizes the text to UPPERCASE
const normalizeStatus = (status) => String(status || '').trim().toUpperCase();

const CashierDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('UNPAID'); // Default tab to what needs attention
  const [billingOrder, setBillingOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'Rs.');

  useEffect(() => {
    const checkCurrency = () => {
      setCurrency(localStorage.getItem('currency') || 'Rs.');
    };
    window.addEventListener('storage', checkCurrency);
    return () => window.removeEventListener('storage', checkCurrency);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await db.getOrders();
      
      if (Array.isArray(data)) {
        // THE FILTER: Only keep UNPAID and PAID orders for the Cashier view
        const cashierOrders = data.filter(order => {
          const status = normalizeStatus(order.status);
          return status === 'UNPAID' || status === 'PAID';
        });
        setOrders(cashierOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter for the UI Table based on the selected tab
  const filteredOrders = orders.filter(order => {
    if (filter === 'ALL') return true;
    return normalizeStatus(order.status) === filter;
  });

  // Statistics Calculations
  const isToday = (value) => {
    if (!value) return false;
    return new Date(value).toDateString() === new Date().toDateString();
  };

  const todaysOrders = orders.filter(order => isToday(order.created_at));
  const unpaidToday = todaysOrders.filter(order => normalizeStatus(order.status) === 'UNPAID');
  const paidToday = todaysOrders.filter(order => normalizeStatus(order.status) === 'PAID');

  const openBilling = (order) => {
    setBillingOrder(order);
    setPaymentMethod('Cash');
  };

  const completeCheckout = async () => {
    if (!billingOrder) return;

    try {
      await db.updateOrderStatus(billingOrder.id, 'PAID');
      alert('Order settled successfully');
      setBillingOrder(null);
      fetchOrders();
    } catch (error) {
      alert(error.message || 'Failed to complete checkout');
    }
  };

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">Pending Checkouts</h3>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Receipt size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{unpaidToday.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">Today's Revenue</h3>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Banknote size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {currency}{paidToday.reduce((sum, o) => sum + Number(o.total), 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">Today's Completed Orders</h3>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <CheckCircle size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{paidToday.length}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            All Tickets
          </button>
          <button
            onClick={() => setFilter('UNPAID')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'UNPAID' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            To Checkout
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
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders found.</td></tr>
              ) : (
                filteredOrders.map(order => {
                  const status = normalizeStatus(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono">#{order.id}</td>
                      <td className="p-4 font-bold">{order.table_number}</td>
                      <td className="p-4">{order.waiter_name || 'N/A'}</td>
                      <td className="p-4 font-bold text-slate-800">{currency}{Number(order.total).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4">
                        {status === 'UNPAID' && (
                          <button
                            type="button"
                            onClick={() => openBilling(order)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-bold shadow-sm"
                          >
                            <Banknote size={14} /> Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BillingDialog
        order={billingOrder}
        currency={currency}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onClose={() => setBillingOrder(null)}
        onComplete={completeCheckout}
      />
    </div>
  );
};

export default CashierDashboard;