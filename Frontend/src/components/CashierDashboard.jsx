import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { OrderStatus } from '../types';
import { Receipt, CreditCard, Banknote, CheckCircle, Search } from 'lucide-react';

const CashierDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = () => {
    setOrders(db.getOrders().filter(o => o.status !== OrderStatus.PAID));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePayment = () => {
    if (!selectedOrder) return;
    db.updateOrderStatus(selectedOrder.id, OrderStatus.PAID);
    alert(`Payment of $${selectedOrder.total.toFixed(2)} processed via ${paymentMethod}!`);
    setSelectedOrder(null);
    fetchOrders();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Order List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by table or order ID..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders
            .filter(o => o.tableNumber.includes(searchTerm) || o.id.toString().includes(searchTerm))
            .map(order => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`p-6 rounded-2xl border transition-all text-left flex justify-between items-center ${
                selectedOrder?.id === order.id 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                : 'bg-white border-slate-100 hover:border-indigo-300 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-black uppercase">Table {order.tableNumber}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black ${selectedOrder?.id === order.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>#{order.id}</span>
                </div>
                <p className={`text-sm ${selectedOrder?.id === order.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {order.items.length} items • {order.status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">${order.total.toFixed(2)}</p>
                <p className={`text-[10px] font-bold uppercase ${selectedOrder?.id === order.id ? 'text-indigo-200' : 'text-slate-400'}`}>Click to bill</p>
              </div>
            </button>
          ))}
          {orders.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400">
              No orders ready for billing.
            </div>
          )}
        </div>
      </div>

      {/* Bill Preview & Payment */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col h-fit overflow-hidden sticky top-8">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-3 text-slate-800 font-bold text-lg">
            <Receipt className="text-indigo-600" />
            <span>Bill Details</span>
            {selectedOrder && <span className="ml-auto text-indigo-600">Table {selectedOrder.tableNumber}</span>}
          </div>
        </div>

        {selectedOrder ? (
          <>
            <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[400px]">
              <div className="space-y-3">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{item.quantity}x {item.name}</span>
                    <span className="font-bold text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-6 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-slate-500 text-sm">
                  <span>Subtotal</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-sm">
                  <span>Service Tax (10%)</span>
                  <span>${(selectedOrder.total * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-slate-900 pt-4">
                  <span>Total Due</span>
                  <span>${(selectedOrder.total * 1.1).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('Card')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'Card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-100 text-slate-500'
                    }`}
                  >
                    <CreditCard size={18} /> Card
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('Cash')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'Cash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-100 text-slate-500'
                    }`}
                  >
                    <Banknote size={18} /> Cash
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50">
              <button 
                onClick={handlePayment}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg"
              >
                <CheckCircle size={20} />
                Complete Payment
              </button>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-4">
            <Receipt size={48} className="mx-auto opacity-20" />
            <p className="text-sm">Select an order from the list to generate a bill.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierDashboard;