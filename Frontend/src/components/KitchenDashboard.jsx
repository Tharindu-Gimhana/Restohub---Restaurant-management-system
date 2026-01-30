import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { OrderStatus } from '../types';
import { Flame, Check, Clock, AlertCircle } from 'lucide-react';

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);

  const fetchOrders = () => {
    const all = db.getOrders();
    setOrders(all.filter(o => [OrderStatus.PENDING, OrderStatus.COOKING, OrderStatus.READY].includes(o.status)));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Live updates
    return () => clearInterval(interval);
  }, []);

  const updateStatus = (orderId, nextStatus) => {
    db.updateOrderStatus(orderId, nextStatus);
    fetchOrders();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {orders.length > 0 ? (
        orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className={`p-4 flex justify-between items-center ${
              order.status === OrderStatus.PENDING ? 'bg-amber-50 text-amber-700' :
              order.status === OrderStatus.COOKING ? 'bg-indigo-50 text-indigo-700' : 'bg-green-50 text-green-700'
            }`}>
              <div className="flex items-center gap-2">
                {order.status === OrderStatus.PENDING ? <Clock size={18} /> : 
                 order.status === OrderStatus.COOKING ? <Flame size={18} className="animate-pulse" /> : <Check size={18} />}
                <span className="font-bold">Table {order.tableNumber}</span>
              </div>
              <span className="text-xs font-bold bg-white/50 px-2 py-0.5 rounded uppercase">Order #{order.id}</span>
            </div>

            <div className="p-4 flex-1 space-y-3">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Order Content</div>
              <ul className="space-y-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium">
                      <span className="inline-block w-6 text-indigo-600 font-bold">{item.quantity}x</span>
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Received: {new Date(order.createdAt).toLocaleTimeString()}</span>
                <span>Wait time: {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)} mins</span>
              </div>
              {order.status === OrderStatus.PENDING && (
                <button 
                  onClick={() => updateStatus(order.id, OrderStatus.COOKING)}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Flame size={16} /> Start Cooking
                </button>
              )}
              {order.status === OrderStatus.COOKING && (
                <button 
                  onClick={() => updateStatus(order.id, OrderStatus.READY)}
                  className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Mark as Ready
                </button>
              )}
              {order.status === OrderStatus.READY && (
                <div className="text-center text-green-600 font-bold py-2 flex items-center justify-center gap-1">
                  <Check size={18} /> Awaiting Service
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
          <AlertCircle size={48} className="mb-4" />
          <p className="text-lg font-bold">Kitchen is Clear!</p>
          <p>No active orders at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;