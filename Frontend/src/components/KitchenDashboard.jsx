import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Flame, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- UPDATED: Fetch Orders AND Menu ---
  const fetchData = async () => {
    try {
      // 1. Get both Orders and Menu at the same time
      const [menuData, ordersData] = await Promise.all([
        db.getMenu(),
        db.getOrders()
      ]);

      // 2. Filter Active Orders
      const activeOrders = ordersData
        .filter(o => ['PENDING', 'COOKING', 'READY'].includes(o.status))
        .map(order => {
          // A. Parse the JSON string from DB
          let rawItems = [];
          try {
            rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
          } catch (e) {
            console.error("JSON Parse error for order:", order.id);
          }

          // B. "Hydrate" items: Find the name using the menuId
          const itemsWithNames = rawItems.map(item => {
            const menuDetail = menuData.find(m => m.id === item.menuId);
            return {
              ...item,
              name: menuDetail ? menuDetail.name : 'Unknown Item' // <--- THE FIX
            };
          });

          return { ...order, items: itemsWithNames };
        });

      setOrders(activeOrders);
    } catch (error) {
      console.error("Error loading kitchen data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Initial Load
    const interval = setInterval(fetchData, 5000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  // --- Update Status Helper ---
  const updateStatus = async (orderId, nextStatus) => {
    try {
      await db.updateOrderStatus(orderId, nextStatus);
      fetchData(); // Refresh data immediately after update
    } catch (error) {
      alert("Failed to update order status");
    }
  };

  if (loading && orders.length === 0) return <div className="p-8 text-center">Loading Kitchen...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Kitchen Display System</h2>
        <button onClick={fetchData} className="bg-white p-2 rounded-full shadow-sm hover:bg-slate-100">
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
                          {/* We display Quantity and Name here */}
                          <span className="inline-block w-8 text-indigo-600 font-bold">{item.quantity}x</span>
                          {item.name} 
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400 italic">No items details</li>
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