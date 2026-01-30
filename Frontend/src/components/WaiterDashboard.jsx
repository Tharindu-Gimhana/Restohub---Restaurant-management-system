import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { OrderStatus } from '../types';
import { ShoppingCart, Plus, Minus, Search, Trash2, CheckCircle, UtensilsCrossed } from 'lucide-react';

const TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const WaiterDashboard = ({ user, view = 'tables' }) => {
  const [menu, setMenu] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Main');

  useEffect(() => {
    setMenu(db.getMenu());
    setActiveOrders(db.getOrders().filter(o => o.waiterId === user.id));
  }, [user.id]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuId === item.id);
      if (existing) {
        return prev.map(i => i.menuId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: Date.now(), menuId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  };

  const removeFromCart = (menuId) => {
    setCart(prev => prev.filter(i => i.menuId !== menuId));
  };

  const updateQuantity = (menuId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.menuId === menuId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const placeOrder = () => {
    if (!selectedTable || cart.length === 0) return;
    
    const newOrder = {
      id: db.getOrders().length + 1,
      tableNumber: selectedTable,
      status: OrderStatus.PENDING,
      items: cart,
      total: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
      createdAt: new Date().toISOString(),
      waiterId: user.id
    };

    db.saveOrder(newOrder);
    setCart([]);
    setSelectedTable(null);
    setActiveOrders(prev => [...prev, newOrder]);
    alert(`Order for Table ${selectedTable} placed!`);
  };

  const getTableStatus = (tableNum) => {
    const order = activeOrders.find(o => o.tableNumber === tableNum && o.status !== OrderStatus.PAID);
    return order ? order.status : 'AVAILABLE';
  };

  if (view === 'orders') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800">My Active Orders</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.filter(o => o.status !== OrderStatus.PAID).map(order => (
            <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold">Table {order.tableNumber}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === OrderStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                  order.status === OrderStatus.COOKING ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="space-y-2 mb-4 border-y border-slate-50 py-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-slate-600">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">{new Date(order.createdAt).toLocaleTimeString()}</span>
                <span className="font-bold text-indigo-600">${order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
          {activeOrders.filter(o => o.status !== OrderStatus.PAID).length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400">
              No active orders under your service.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Table Selection & Menu */}
      <div className="lg:col-span-2 space-y-8">
        {!selectedTable ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Select a Table</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {TABLES.map(table => {
                const status = getTableStatus(table);
                return (
                  <button
                    key={table}
                    onClick={() => setSelectedTable(table)}
                    className={`h-24 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      status === 'AVAILABLE' 
                      ? 'bg-white border-2 border-slate-100 hover:border-indigo-600 text-slate-700 shadow-sm'
                      : 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-xs uppercase font-bold opacity-60">Table</span>
                    <span className="text-2xl font-black">{table}</span>
                    <span className="text-[10px] mt-1 font-bold">{status}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedTable(null)} className="text-indigo-600 font-medium hover:underline flex items-center gap-1">
                ← Back to Tables
              </button>
              <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                TABLE {selectedTable}
              </div>
            </div>

            {/* Menu Tabs & Filter */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search menu..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                {['Main', 'Starter', 'Dessert', 'Beverage'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {menu
                .filter(item => item.category === activeTab && item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={item.stock === 0}
                    className={`group bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-left hover:border-indigo-600 hover:shadow-md transition-all ${item.stock === 0 ? 'opacity-50' : ''}`}
                  >
                    <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                      <UtensilsCrossed size={32} className="text-slate-200 group-hover:text-indigo-200 transition-colors" />
                    </div>
                    <p className="font-bold text-slate-800 leading-tight mb-1">{item.name}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-indigo-600 font-bold">${item.price.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Stock: {item.stock}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart / Order Summary */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col h-[calc(100vh-200px)] overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center gap-3 text-slate-800 font-bold text-lg">
            <ShoppingCart className="text-indigo-600" />
            <span>Current Order</span>
            {selectedTable && <span className="ml-auto text-indigo-600">#Table {selectedTable}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length > 0 ? (
            cart.map(item => (
              <div key={item.menuId} className="flex justify-between items-center group">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-indigo-600 font-bold">${item.price.toFixed(2)} ea</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl">
                  <button onClick={() => updateQuantity(item.menuId, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"><Minus size={14} /></button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menuId, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={14} /></button>
                </div>
                <button onClick={() => removeFromCart(item.menuId)} className="ml-3 p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
              <ShoppingCart size={48} className="mb-4" />
              <p>Your cart is empty.<br/>Add items to get started.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 space-y-4">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>${cart.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax (10%)</span>
            <span>${(cart.reduce((s, i) => s + (i.price * i.quantity), 0) * 0.1).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-black text-slate-900 border-t border-slate-200 pt-4">
            <span>Total</span>
            <span>${(cart.reduce((s, i) => s + (i.price * i.quantity), 0) * 1.1).toFixed(2)}</span>
          </div>
          
          <button 
            disabled={cart.length === 0 || !selectedTable}
            onClick={placeOrder}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              cart.length > 0 && selectedTable 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={20} />
            Confirm & Send to Kitchen
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaiterDashboard;