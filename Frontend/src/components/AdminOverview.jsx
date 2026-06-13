import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { db } from '../services/db'; // Import your DB helper

const AdminOverview = ({ user }) => {
  // 1. Initialize state directly from localStorage
  // If 'currency' exists in storage, use it; otherwise default to '$'
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || '$';
  });

  // 2. Handle Currency Change
  const handleCurrencyChange = (e) => {
    const newSymbol = e.target.value;
    setCurrency(newSymbol);           // Update the UI
    localStorage.setItem('currency', newSymbol); // Save to Local Storage
    
    // Optional: Dispatch an event if other components need to know immediately
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="space-y-6">
      {/* 4. UPDATED: Header with Currency Chooser */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Business Overview</h2>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
          <label className="text-sm font-bold text-slate-600">Currency:</label>
          <select 
            value={currency}
            onChange={handleCurrencyChange}
            className="bg-slate-50 border-none text-slate-800 text-sm font-bold rounded focus:ring-0 cursor-pointer outline-none"
          >
            <option value="$">USD ($)</option>
            <option value="Rs ">LKR (Rs)</option>
            <option value="€">EUR (€)</option>
            <option value="£">GBP (£)</option>
          </select>
        </div>
      </div>
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          // 5. UPDATED: Used `currency` variable here
          { label: 'Total Revenue', value: `${currency} 12,450`, icon: DollarSign, color: 'bg-green-500' },
          { label: 'Total Orders', value: '1,240', icon: ShoppingBag, color: 'bg-indigo-500' },
          { label: 'Active Staff', value: '8', icon: Users, color: 'bg-orange-500' },
          { label: 'Updated Growth', value: '+12%', icon: TrendingUp, color: 'bg-blue-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.color} text-white`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-4">Quick Actions</h3>
        <p className="text-slate-500">Select an option from the sidebar to manage your Menu, Staff, or view Reports.</p>
      </div>
    </div>
  );
};

export default AdminOverview;