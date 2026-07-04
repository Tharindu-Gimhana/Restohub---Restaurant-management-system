import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { PlusCircle, Clock, MinusCircle } from 'lucide-react';
import { useOrderContext } from '../Context/OrderContext';
import ActiveOrderCard from './ActiveOrderCard';

const WaiterDashboard = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); 
  const [editingOrderId, setEditingOrderId] = useState(null); // NEW: Track which order is being edited
  
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
    items: {} // { menuId: quantity }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuData, ordersData] = await Promise.all([
        db.getMenu(),
        db.getOrders()
      ]);
      setMenu(menuData);
      const activeOrders = Array.isArray(ordersData)
        ? ordersData.filter(order => ['PENDING', 'COOKING', 'READY'].includes(String(order.status).toUpperCase()))
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);


  // Add this inside WaiterDashboard component
const handleStartUpdate = (order) => {
    console.log("Editing Order:", order.id); // Debug Log

    setEditingOrderId(order.id); // Remember which order we are editing
    // Lock table number & clear items so you can add NEW ones
    setNewOrder({ 
       tableNumber: order.table_number, 
       items: {} 
    });
    setActiveTab('new'); // Switch view
    setIsOrderMode(true); // Turn on Sidebar
};

  // 2. EXTRACT CATEGORIES (Fixed - No Loop!)
  useEffect(() => {
    if (menu.length > 0) {
      const uniqueCats = [...new Set(menu.map(item => {
        return (item.category || 'Other').trim(); 
      }))];

      console.log("Sending categories to Sidebar:", uniqueCats);
      setCategories(uniqueCats);

      // Only set default if we are currently on 'All' or invalid category
      if (selectedCategory === 'All' || !uniqueCats.includes(selectedCategory)) {
         if (uniqueCats.length > 0) {
            setSelectedCategory(uniqueCats[0]);
         }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, setCategories]); // <--- REMOVED selectedCategory dependencies to fix the loop!


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

  // Helper: Place Order
 { /* const handlePlaceOrder = async () => {
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
      setNewOrder({ tableNumber: '', items: {} });
      setActiveTab('orders');
      setIsOrderMode(false); // Turn off sidebar mode
      const updatedOrders = await db.getOrders();
      setOrders(updatedOrders);
      alert('Order placed successfully!');
    } catch (e) {
      alert('Failed to place order');
    }
  };   */}


  const handleSubmit = async () => {
    // 1. Validation (Don't submit empty orders)
    if (!newOrder.tableNumber || Object.keys(newOrder.items).length === 0) {
       alert("Please select items and a table number.");
       return;
    }

    try {
       // --- SCENARIO A: UPDATING AN EXISTING ORDER ---
       // This runs ONLY if you clicked the "Edit" button
       if (editingOrderId) {
          console.log("Updating Order ID:", editingOrderId); // Debug Log

          const updateData = {
             orderId: editingOrderId,
             // Convert items object { "101": 2 } -> Array [{ menuId: 101, quantity: 2 }]
             items: Object.entries(newOrder.items).map(([id, qty]) => ({ 
                 menuId: parseInt(id), 
                 quantity: qty 
             })),
             addedTotal: calculateTotal() // <--- ADD THIS LINE! This calculates the price of the new items
          };

          // Call the UPDATE function (adds items to existing order)
          await db.updateOrder(updateData);
          alert("Order Updated Successfully!!!!!!");

       } else {
          // --- SCENARIO B: CREATING A NEW ORDER ---
          // This runs if you clicked "New Order"
          const orderData = {
             tableNumber: newOrder.tableNumber,
             items: Object.entries(newOrder.items).map(([id, qty]) => ({ 
                 menuId: parseInt(id), 
                 quantity: qty 
             })),
             total: calculateTotal() // Helper function to calc total
          };
          
          // Call the CREATE function
          await db.saveOrder(orderData);
          alert("New Order Placed!");
       }

       // --- CLEANUP (Reset Form) ---
       setEditingOrderId(null); // IMPORTANT: Clear the edit ID
       setNewOrder({ tableNumber: '', items: {} });
       setActiveTab('orders'); // Go back to the list
       setIsOrderMode(false);
       
       // Refresh List to see changes
       const updatedOrders = await db.getOrders();
       setOrders(updatedOrders);

    } catch (e) { 
       console.error(e);
       alert(e.message || 'Action failed'); 
    }
};



const handleCancel = async (orderId) => {
    if(!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
       // USE THE NEW DB FUNCTION
       await db.cancelOrder(orderId);

       // Optimistic Update (Remove from screen immediately)
       setOrders(prev => prev.filter(o => o.id !== orderId));
       
    } catch(e) { 
       alert(e.message); // Shows "Kitchen has already started" if 403
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
      {/* Tab Switcher */}
<div className="flex gap-4 border-b border-slate-200 pb-4">
  <button 
    onClick={() => { setActiveTab('orders'); setIsOrderMode(false); }}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
      activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Clock size={18} /> Active Orders
  </button>

  {/* FIX THIS BUTTON: Clear state when clicking New Order */}
  <button 
    onClick={() => { 
        setEditingOrderId(null); // <--- FORGET the order we were editing
        setNewOrder({ tableNumber: '', items: {} }); // Clear the form
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



{/* VIEW 1: ACTIVE ORDERS (Updated with Component) */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* 1. EMPTY STATE (Kept exactly as you had it) */}
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
               <Clock size={32} className="mx-auto mb-2 opacity-50" />
               <p>No active orders</p>
            </div>
          ) : (
            /* 2. ORDERS LIST (Now using the Smart Component) */
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
                    // Check if this item is in the cart
                    const quantity = newOrder.items[item.id] || 0;

                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-lg border transition-all flex flex-col justify-between gap-3 ${
                          quantity > 0 ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'bg-white border-slate-200'
                        }`}
                      >
                         {/* Food Info */}
                         <div className="flex justify-between items-start">
                            <div>
                               <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                               <p className="text-sm text-slate-500 mt-1">{currency}{item.price}</p>
                            </div>
                         </div>

                         {/* +/- CONTROLS RESTORED HERE */}
                         <div className="flex items-center justify-end gap-3 mt-auto">
                            {quantity > 0 && (
                              <button 
                                onClick={() => setNewOrder(prev => {
                                   const currentQty = prev.items[item.id] || 0;
                                   const newItems = { ...prev.items };
                                   if (currentQty > 1) {
                                      newItems[item.id] = currentQty - 1;
                                   } else {
                                      delete newItems[item.id]; // Remove if 0
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
                    onClick={handleSubmit} // <--- Change to the smart function
                    disabled={!newOrder.tableNumber || Object.keys(newOrder.items).length === 0}
                    className={`w-full py-3 rounded-xl font-bold transition-colors text-white ${
                      editingOrderId 
                        ? 'bg-orange-600 hover:bg-orange-700' // Visual clue for Update
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