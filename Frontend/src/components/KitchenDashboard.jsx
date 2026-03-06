import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { AlertCircle, RefreshCw } from 'lucide-react';
// 1. ADDED IMPORT HERE
import KitchenOrderCard from './Kitchenordercard';

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
            /* 2. REPLACED THE LONG HTML BLOCK WITH THIS ONE COMPONENT */
            <KitchenOrderCard 
               key={order.id} 
               order={order} 
               onUpdateStatus={updateStatus} 
            />
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