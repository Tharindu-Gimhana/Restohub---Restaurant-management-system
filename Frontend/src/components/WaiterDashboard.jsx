import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { PlusCircle, Clock, CheckCircle, Utensils, MinusCircle } from 'lucide-react';
import { useOrderContext } from '@/Context/OrderContext';

const WaiterDashboard = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'new'
  
  // Grab the controls from the Context
  const { 
    setIsOrderMode, 
    setCategories, 
    selectedCategory, 
    setSelectedCategory 
  } = useOrderContext();

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
  
  
  // New Order State
  const [newOrder, setNewOrder] = useState({
    tableNumber: '',
    items: {} // { menuId: quantity }
  });

  // 1. Safe Data Loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch Menu and Orders in parallel
        const [menuData, ordersData] = await Promise.all([
          db.getMenu(),
          db.getOrders()
        ]);
        
        setMenu(menuData);
        // Ensure orders is an array before setting
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch (e) {
        console.error("Error loading waiter data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate Total for New Order
  const calculateTotal = () => {
    return Object.entries(newOrder.items).reduce((total, [id, qty]) => {
      const item = menu.find(m => m.id === parseInt(id));
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  const handlePlaceOrder = async () => {
    if (!newOrder.tableNumber || Object.keys(newOrder.items).length === 0) return;

    try {
      const orderData = {
        tableNumber: newOrder.tableNumber,
        items: Object.entries(newOrder.items).map(([id, qty]) => ({
          menuId: parseInt(id),
          quantity: qty
        })),
        total: calculateTotal()
      };

      await db.saveOrder(orderData);
      
      // Reset Form & Refresh
      setNewOrder({ tableNumber: '', items: {} });
      setActiveTab('orders');
      
      // Refresh Orders List
      const updatedOrders = await db.getOrders();
      setOrders(updatedOrders);
      
      alert('Order placed successfully!');
    } catch (e) {
      alert('Failed to place order');
    }
  };



// 1. CALCULATE CATEGORIES EFFICIENTLY
  // We extract unique categories from the loaded menu
  useEffect(() => {
    if (menu.length > 0) {
      const uniqueCats = ['All', ...new Set(menu.map(item => item.category || 'Other'))];
      // Send these to the Sidebar!

      console.log("Sending categories to Sidebar:", uniqueCats); // <--- DEBUG LOG
      setCategories(uniqueCats);
    }
  }, [menu, setCategories]);


  // 2. HANDLE "NEW ORDER" CLICK
  const handleNewOrderClick = () => {
    setActiveTab('new');
    setIsOrderMode(true); // <--- This transforms the Sidebar!
    setSelectedCategory('All'); // Reset to first category
  };

  // 3. FILTER FOODS BASED ON SIDEBAR SELECTION
  // This listens to 'selectedCategory' which changes when you click the Sidebar
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return menu;
    return menu.filter(item => (item.category || 'Other') === selectedCategory);
  }, [selectedCategory, menu]);






  if (loading) return <div className="p-8 text-center">Loading Service Dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-slate-200 pb-4">
        
        {/* BUTTON 1: ACTIVE ORDERS (Clicking this should HIDE categories) */}
        <button 
          onClick={() => {
            setActiveTab('orders');
            setIsOrderMode(false); // <--- IMPORTANT: Turn OFF Order Mode
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock size={18} /> Active Orders
        </button>

        {/* BUTTON 2: NEW ORDER (Clicking this should SHOW categories) */}
        <button 
          onClick={() => {
            setActiveTab('new');
            setIsOrderMode(true);        // <--- 1. Tell Sidebar to show categories
            setSelectedCategory('All');  // <--- 2. Reset filter to "All"
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'new' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle size={18} /> New Order
        </button>
      </div>

      {/* VIEW 1: ACTIVE ORDERS */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.length === 0 ? (
            <p className="text-slate-500 col-span-3 text-center py-8">No active orders found.</p>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Table {order.table_number}</h3>
                    <span className="text-xs text-slate-500">#{order.id} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    order.status === 'READY' ? 'bg-green-100 text-green-700' : 
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                {/* Note: Items might not be in the simple order fetch, so we just show total */}
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Total Bill</span>
                  <span className="text-lg font-bold text-slate-800">{currency}{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

{/* VIEW 2: NEW ORDER FORM */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Menu Selection */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-700">Select Items</h3>
            <div className="grid grid-cols-2 gap-3">
              {menu.map(item => {
                // Get current quantity for this specific item
                const quantity = newOrder.items[item.id] || 0;

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-lg border transition-all flex justify-between items-center ${
                      quantity > 0 ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Product Info */}
                    <div>
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-sm text-slate-500">{currency}{item.price}</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      {/* Minus Button (Only show if quantity > 0) */}
                      {quantity > 0 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Stop bubbling
                            setNewOrder(prev => {
                              const currentQty = prev.items[item.id] || 0;
                              const newItems = { ...prev.items };
                              
                              if (currentQty > 1) {
                                newItems[item.id] = currentQty - 1;
                              } else {
                                delete newItems[item.id]; // Remove item if count goes to 0
                              }
                              
                              return { ...prev, items: newItems };
                            });
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <MinusCircle size={24} />
                        </button>
                      )}

                      {/* Quantity Display */}
                      {quantity > 0 && (
                        <span className="font-bold text-slate-800 w-6 text-center">
                          {quantity}
                        </span>
                      )}

                      {/* Plus Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewOrder(prev => ({
                            ...prev,
                            items: { ...prev.items, [item.id]: (prev.items[item.id] || 0) + 1 }
                          }));
                        }}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <PlusCircle size={24} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 h-fit">
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

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
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
              onClick={handlePlaceOrder}
              disabled={!newOrder.tableNumber || Object.keys(newOrder.items).length === 0}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              Send to Kitchen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterDashboard;