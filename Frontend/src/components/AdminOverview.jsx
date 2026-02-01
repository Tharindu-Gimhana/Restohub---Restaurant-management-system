import React from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react';

const AdminOverview = ({ user }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Business Overview</h2>
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: '$12,450', icon: DollarSign, color: 'bg-green-500' },
          { label: 'Total Orders', value: '1,240', icon: ShoppingBag, color: 'bg-indigo-500' },
          { label: 'Active Staff', value: '8', icon: Users, color: 'bg-orange-500' },
          { label: 'Growth', value: '+12%', icon: TrendingUp, color: 'bg-blue-500' },
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