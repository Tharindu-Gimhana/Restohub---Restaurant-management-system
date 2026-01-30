import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Plus, Edit2, Trash2, DollarSign, ShoppingBag, Users, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminDashboard = ({ view = 'overview' }) => {
  const [menu, setMenu] = useState([]);
  const [sales, setSales] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Main', price: 0, stock: 0 });

  useEffect(() => {
    setMenu(db.getMenu());
    setSales(db.getSalesData());
  }, []);

  const handleAddItem = (e) => {
    e.preventDefault();
    const items = [...menu];
    const item = {
      ...newItem,
      id: Math.max(...items.map(i => i.id), 0) + 1
    };
    items.push(item);
    db.updateMenu(items);
    setMenu(items);
    setShowAddMenu(false);
    setNewItem({ name: '', category: 'Main', price: 0, stock: 0 });
  };

  const deleteItem = (id) => {
    const items = menu.filter(i => i.id !== id);
    db.updateMenu(items);
    setMenu(items);
  };

  if (view === 'menu') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">Menu Items</h3>
          <button 
            onClick={() => setShowAddMenu(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Add New Item
          </button>
        </div>

        {showAddMenu && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100">
            <h4 className="font-semibold mb-4">Add Menu Item</h4>
            <form onSubmit={handleAddItem} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input 
                type="text" 
                placeholder="Name" 
                className="px-3 py-2 border rounded"
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                required
              />
              <select 
                className="px-3 py-2 border rounded"
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
              >
                <option>Main</option>
                <option>Starter</option>
                <option>Dessert</option>
                <option>Beverage</option>
              </select>
              <input 
                type="number" 
                placeholder="Price" 
                className="px-3 py-2 border rounded"
                value={newItem.price || ''}
                onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                required
              />
              <input 
                type="number" 
                placeholder="Stock" 
                className="px-3 py-2 border rounded"
                value={newItem.stock || ''}
                onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value)})}
                required
              />
              <div className="col-span-full flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddMenu(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded font-medium">Save Item</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Item Name</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Category</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Price</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Stock</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menu.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm">{item.category}</span></td>
                  <td className="px-6 py-4 text-slate-600">${item.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${item.stock < 10 ? 'text-red-500' : 'text-slate-600'}`}>
                      {item.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                    <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Overview / Reports fallback
  const chartData = [
    { name: 'Mon', sales: 400 },
    { name: 'Tue', sales: 300 },
    { name: 'Wed', sales: 600 },
    { name: 'Thu', sales: 800 },
    { name: 'Fri', sales: 1200 },
    { name: 'Sat', sales: 1500 },
    { name: 'Sun', sales: 1100 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 text-green-600 rounded-xl">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
          <h4 className="text-2xl font-bold text-slate-800">${sales?.totalRevenue.toFixed(2) || '0.00'}</h4>
          <p className="text-xs text-green-600 mt-2">↑ 12% from last week</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Orders</p>
          <h4 className="text-2xl font-bold text-slate-800">{sales?.totalOrders || 0}</h4>
          <p className="text-xs text-blue-600 mt-2">↑ 5% from yesterday</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Customer Visits</p>
          <h4 className="text-2xl font-bold text-slate-800">1,284</h4>
          <p className="text-xs text-indigo-600 mt-2">↑ 24% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Low Stock Items</p>
          <h4 className="text-2xl font-bold text-slate-800">{menu.filter(i => i.stock < 10).length}</h4>
          <p className="text-xs text-red-600 mt-2">Needs immediate attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-6">Weekly Sales Performance</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#4f46e5' : '#c7d2fe'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-6">Recent Completed Orders</h4>
          <div className="space-y-4">
            {sales?.recentOrders.length > 0 ? (
              sales.recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-semibold text-slate-800">Order #{order.id}</p>
                    <p className="text-xs text-slate-500">Table {order.tableNumber} • {order.items.length} items</p>
                  </div>
                  <p className="font-bold text-indigo-600">${order.total.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 py-10">No completed orders yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;