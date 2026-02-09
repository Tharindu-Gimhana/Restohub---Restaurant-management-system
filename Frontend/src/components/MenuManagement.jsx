import React, { useState } from 'react';
import { db } from '../services/db'; // <--- We use this now!
import { PlusCircle, Save } from 'lucide-react';

const MenuManagement = ({ user }) => {
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Main Course', 
    price: '',
    stock: '100', 
    is_available: true
  });

  const [loading, setLoading] = useState(false);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stops page from reloading
    setLoading(true);

    try {
      // --- UPDATED: Use the db helper function ---
      // This is cleaner because 'db.js' handles the URL and Headers for you
      await db.addMenuItem(formData); 

      alert('Menu Item Added Successfully!');
      
      // Reset Form
      setFormData({
        name: '',
        category: 'Main Course',
        price: '',
        stock: '100',
        is_available: true
      });

    } catch (error) {
      console.error(error);
      alert(error.message || 'Error adding menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <PlusCircle className="text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">Add New Menu Item</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Name */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Item Name</label>
          <input 
            type="text" 
            name="name" 
            required
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="e.g. Double Cheese Burger"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        {/* Category & Price Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
            <select 
              name="category" 
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              value={formData.category}
              onChange={handleChange}
            >
              <option>Starter</option>
              <option>Main Course</option>
              <option>Dessert</option>
              <option>Beverage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Price ($)</label>
            <input 
              type="number" 
              name="price" 
              step="0.01"
              required
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              placeholder="0.00"
              value={formData.price}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Stock & Availability Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Stock Quantity</label>
            <input 
              type="number" 
              name="stock" 
              required
              className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              value={formData.stock}
              onChange={handleChange}
            />
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                name="is_available"
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                checked={formData.is_available}
                onChange={handleChange}
              />
              <span className="text-sm font-bold text-slate-700">Available for Order</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          {/* This button has type="submit". 
              When clicked, it tells the FORM to run 'onSubmit', which runs 'handleSubmit'.
          */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:bg-slate-400"
          >
            {loading ? 'Saving...' : <><Save size={20} /> Save to Menu</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MenuManagement;