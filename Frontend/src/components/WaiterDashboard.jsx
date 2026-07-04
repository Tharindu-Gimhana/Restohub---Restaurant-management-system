import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { PlusCircle, Clock, MinusCircle, RefreshCw } from 'lucide-react'; 
import { useOrderContext } from '../Context/OrderContext';
import ActiveOrderCard from './ActiveOrderCard';
import { io } from 'socket.io-client';

const WaiterDashboard = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); 
  const [editingOrderId, setEditingOrderId] = useState(null); 
  
  // Grab controls from Context
  const { 
    setIsOrderMode, 
    setCategories, 
    selectedCategory, 
    setSelectedCategory 
  } = useOrderContext();

  const [currency, setCurrency] = useState(localStorage.getItem('currency') || '$');

  // Currency Listener
  useEffect(() => {
    const checkCurrency = () => {
      setCurrency(localStorage.getItem('currency') || '$');
    };
    window.addEventListener('storage', checkCurrency);
    return () => window.removeEventListener('storage', checkCurrency);
  }, []);
  
  // New Order State
  const [newOrder, setNewOrder] = useState({
    tableNumber: '',
    items: {} 
  });

  // --- NEW: SOCKET.IO LISTENER ---
  useEffect(() => {
    // Determine the base URL safely to prevent build crashes
    const getBaseUrl = () => {
      try {
        return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace('/api', '');
      } catch (e) {
        return 'http://localhost:5000';
      }
    };

    const socketUrl = getBaseUrl();
    const socket = io(socketUrl);
    
    // Listen for the specific signal from the backend
    socket.on('order_updated', () => {
      console.log("Real-time update received! Fetching fresh data...");
      fetchData();
    });

    // Cleanup connection when leaving the page
    return () => socket.disconnect();
  }, []);
  // -------------------------------

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuData, ordersData] = await Promise.all([
        db.getMenu(),
        db.getOrders()
      ]);
      setMenu(menuData);
      
      // THE FIX: Filter out ONLY 'PAID' and 'UNPAID'. Keep everything else!
      const activeOrders = Array.isArray(ordersData)
        ? ordersData.filter(order => {
            const status = String(order.status).toUpperCase();
            return status !== 'PAID' && status !== 'UNPAID';
          })
        : [];
        
      setOrders(activeOrders);
    } catch (e) {
      console.error("Error loading waiter data:", e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Load Data
  useEffect(() => {
    fetchData();
  }, []);

  const handleStartUpdate = (order) => {
    console.log("Editing Order:", order.id); 
    setEditingOrderId(order.id); 
    setNewOrder({ 
       tableNumber: order.table_number, 
       items: {} 
    });
    setActiveTab('new'); 
    setIsOrderMode(true); 
  };

  // 2. EXTRACT CATEGORIES 
  useEffect(() => {
    if (menu.length > 0) {
      const uniqueCats = [...new Set(menu.map(item => {
        return (item.category || 'Other').trim(); 
      }))];

      setCategories(uniqueCats);

      if (selectedCategory === 'All' || !uniqueCats.includes(selectedCategory)) {
         if (uniqueCats.length > 0) {
            setSelectedCategory(uniqueCats[0]);
         }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, setCategories]); 

  // 3. FILTER FOODS
  const filteredItems = useMemo(() => {
    return menu.filter(item => {
      const itemCat = (item.category || 'Other').trim();
      return itemCat === selectedCategory; 
    });
  }, [selectedCategory, menu]);

  // Helper: Calculate Total
  const calculateTotal = () => {
    return Object.entries(newOrder.items).reduce((total, [id, qty]) => {
      const item = menu.find(m => m.id === parseInt(id));
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!newOrder.tableNumber || Object.keys(newOrder.items).length === 0) {
       alert("Please select items and a table number.");
       return;
    }

    try {
       if (editingOrderId) {
          const updateData = {
             orderId: editingOrderId,
             items: Object.entries(newOrder.items).map(([id, qty]) => ({ 
                 menuId: parseInt(id), 
                 quantity: qty 
             })),
             addedTotal: calculateTotal() 
          };
          await db.updateOrder(updateData);
          alert("Order Updated Successfully!");

       } else {
          const orderData = {
             tableNumber: newOrder.tableNumber,
             items: Object.entries(newOrder.items).map(([id, qty]) => ({ 
                 menuId: parseInt(id), 
                 quantity: qty 
             })),
             total: calculateTotal() 
          };
          await db.saveOrder(orderData);
          alert("New Order Placed!");
       }

       // CLEANUP & REDIRECT TO ACTIVE ORDERS
       setEditingOrderId(null); 
       setNewOrder({ tableNumber: '', items: {} });
       setActiveTab('orders'); 
       setIsOrderMode(false);
       
       // Refresh List to see changes
       fetchData(); // Using fetchData here keeps logic perfectly centralized

    } catch (e) { 
       console.error(e);
       alert(e.message || 'Action failed'); 
    }
  };

  const handleCancel = async (orderId) => {
    if(!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
       await db.cancelOrder(orderId);
       setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch(e) { 
       alert(e.message); 
    }
  };

  const handleServe = async (orderId, itemIds) => {
    try {
      await db.updateOrderItemStatus(orderId, itemIds, 'SERVED');
      fetchData();
    } catch (e) {
      alert(e.message || 'Failed to serve items');
    }
  };

  const handleCheckout = async (orderId) => {
    if (!window.confirm('Send this order to cashier?')) return;
    try {
      setOrders(prev => prev.filter(order => order.id !== orderId));
      await db.updateOrderStatus(orderId, 'UNPAID');
      fetchData();
    } catch (e) {
      fetchData();
      alert(e.message || 'Failed to checkout order');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Service Dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* --- UPDATED: Tab Switcher with Refresh Button --- */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        
        {/* Left Side: Tabs */}
        <div className="flex gap-4">
          <button 
            onClick={() => { setActiveTab('orders'); setIsOrderMode(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock size={18} /> Active Orders
          </button>

          <button 
            onClick={() => { 
                setEditingOrderId(null); 
                setNewOrder({ tableNumber: '', items: {} }); 
                setActiveTab('new'); 
                setIsOrderMode(true); 
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'new' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle size={18} /> New Order
          </button>
        </div>

        {/* Right Side: Manual Refresh Button */}
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium shadow-sm"
          title="Refresh Orders"
        >
          <RefreshCw size={18} /> Refresh
        </button>

      </div>

      {/* VIEW 1: ACTIVE ORDERS */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
               <Clock size={32} className="mx-auto mb-2 opacity-50" />
               <p>No active orders</p>
            </div>
          ) : (
            orders.map(order => (
              <ActiveOrderCard 
                 key={order.id} 
                 order={order} 
                 currency={currency}
                 onCancel={handleCancel}       
                 onAddItems={handleStartUpdate} 
                 onServe={handleServe}
                 onCheckout={handleCheckout}
              />
            ))
          )}
        </div>
      )}

      {/* NEW ORDER VIEW */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)] overflow-hidden">
           {/* LEFT SIDE: FOOD GRID */}
           <div className="md:col-span-2 flex flex-col h-full overflow-hidden">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                 <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm">
                   {selectedCategory}
                 </span>
                 <span className="text-slate-400 text-sm font-normal">
                   ({filteredItems.length} items)
                 </span>
              </h3>

              <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-20 pr-2">
                 {filteredItems.map(item => {
                    const quantity = newOrder.items[item.id] || 0;
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-lg border transition-all flex flex-col justify-between gap-3 ${
                          quantity > 0 ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'bg-white border-slate-200'
                        }`}
                      >
                         <div className="flex justify-between items-start">
                            <div>
                               <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                               <p className="text-sm text-slate-500 mt-1">{currency}{item.price}</p>
                            </div>
                         </div>
                         <div className="flex items-center justify-end gap-3 mt-auto">
                            {quantity > 0 && (
                              <button 
                                onClick={() => setNewOrder(prev => {
                                   const currentQty = prev.items[item.id] || 0;
                                   const newItems = { ...prev.items };
                                   if (currentQty > 1) {
                                      newItems[item.id] = currentQty - 1;
                                   } else {
                                      delete newItems[item.id]; 
                                   }
                                   return { ...prev, items: newItems };
                                })}
                                className="text-red-500 hover:bg-red-100 p-1 rounded-full transition-colors"
                              >
                                <MinusCircle size={24} />
                              </button>
                            )}

                            {quantity > 0 && (
                              <span className="font-bold text-slate-800 w-6 text-center text-lg">{quantity}</span>
                            )}

                            <button 
                              onClick={() => setNewOrder(prev => ({
                                ...prev,
                                items: { ...prev.items, [item.id]: (prev.items[item.id] || 0) + 1 }
                              }))}
                              className="text-indigo-600 hover:bg-indigo-100 p-1 rounded-full transition-colors"
                            >
                              <PlusCircle size={24} />
                            </button>
                         </div>
                      </div>
                    );
                 })}
                 
                 {filteredItems.length === 0 && (
                    <p className="col-span-2 text-center text-slate-400 py-10">
                       No items found in {selectedCategory}.
                    </p>
                 )}
              </div>
           </div>
           
           {/* RIGHT SIDE: ORDER SUMMARY */}
           <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 h-fit flex flex-col">
             <h3 className="font-bold text-lg text-slate-800 mb-4">Current Order</h3>
             
             <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Table Number</label>
                <input 
                  type="text" 
                  className="w-full border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-1 text-lg font-bold bg-transparent"
                  placeholder="Enter Table #"
                  value={newOrder.tableNumber}
                  onChange={e => setNewOrder({...newOrder, tableNumber: e.target.value})}
                />
              </div>

              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto flex-1">
                {Object.entries(newOrder.items).map(([id, qty]) => {
                  const item = menu.find(m => m.id === parseInt(id));
                  if (!item) return null;
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span>{item.name} <span className="text-slate-400">x{qty}</span></span>
                      <span className="font-medium">{currency}{(item.price * qty).toFixed(2)}</span>
                    </div>
                  );
                })}
                {Object.keys(newOrder.items).length === 0 && (
                  <p className="text-slate-400 text-sm italic text-center py-4">No items selected</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mb-6">
                <div className="flex justify-between items-center text-xl font-bold text-slate-800">
                  <span>Total</span>
                  <span>{currency}{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <button 
                    onClick={handleSubmit} 
                    disabled={!newOrder.tableNumber || Object.keys(newOrder.items).length === 0}
                    className={`w-full py-3 rounded-xl font-bold transition-colors text-white ${
                      editingOrderId 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {editingOrderId ? 'Update Order' : 'Send to Kitchen'}
            </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default WaiterDashboard;