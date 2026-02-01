import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Flame, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Orders Async
  const fetchOrders = async () => {
    try {
      const data = await db.getOrders();
      
      // Filter only active orders (Pending, Cooking, Ready)
      // And ensure 'items' is parsed correctly (sometimes DB sends it as a string)
      const activeOrders = data
        .filter(o => ['PENDING', 'COOKING', 'READY'].includes(o.status))
        .map(order => ({
          ...order,
          // Safety check: if items is a string (JSON), parse it. If it's missing, use empty array.
          items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
        }));

      setOrders(activeOrders);
    } catch (error) {
      console.error("Error loading kitchen orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Initial Load & Auto-Refresh
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // 3. Update Status Async
  const updateStatus = async (orderId, nextStatus) => {
    try {
      await db.updateOrderStatus(orderId, nextStatus);
      fetchOrders(); // Refresh immediately
    } catch (error) {
      alert("Failed to update order status");
    }
  };

  if (loading && orders.length === 0) return <div className="p-8 text-center">Loading Kitchen...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Kitchen Display System</h2>
        <button onClick={fetchOrders} className="bg-white p-2 rounded-full shadow-sm hover:bg-slate-100">
            <RefreshCw size={20} className="text-slate-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.length > 0 ? (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {/* Header */}
              <div className={`p-4 flex justify-between items-center ${
                order.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                order.status === 'COOKING' ? 'bg-indigo-50 text-indigo-700' : 'bg-green-50 text-green-700'
              }`}>
                <div className="flex items-center gap-2">
                  {order.status === 'PENDING' ? <Clock size={18} /> : 
                   order.status === 'COOKING' ? <Flame size={18} className="animate-pulse" /> : <Check size={18} />}
                  <span className="font-bold">Table {order.table_number}</span>
                </div>
                <span className="text-xs font-bold bg-white/50 px-2 py-0.5 rounded uppercase">#{order.id}</span>
              </div>

              {/* Order Content */}
              <div className="p-4 flex-1 space-y-3">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Order Content</div>
                <ul className="space-y-2">
                  {order.items.length > 0 ? (
                    order.items.map((item, i) => (
                      <li key={i} className="flex justify-between items-center">
                        <span className="text-slate-700 font-medium">
                          <span className="inline-block w-8 text-indigo-600 font-bold">{item.quantity}x</span>
                          {item.name}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400 italic">No items details (Check Backend)</li>
                  )}
                </ul>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                  <span>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                
                {order.status === 'PENDING' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'COOKING')}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Flame size={16} /> Start Cooking
                  </button>
                )}
                {order.status === 'COOKING' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'READY')}
                    className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Mark as Ready
                  </button>
                )}
                {order.status === 'READY' && (
                  <div className="text-center text-green-600 font-bold py-2 flex items-center justify-center gap-1">
                    <Check size={18} /> Awaiting Service
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 text-slate-500">
            <AlertCircle size={48} className="mb-4" />
            <p className="text-lg font-bold">Kitchen is Clear!</p>
            <p>No active orders.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;