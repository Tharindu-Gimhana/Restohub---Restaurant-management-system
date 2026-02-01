import React, { useState } from 'react';
import { db } from '../services/db';
import { UserPlus, Save, CheckCircle } from 'lucide-react';

const StaffManagement = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role_id: '2' // Default to Waiter
  });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await db.addStaff(formData);
      setStatus('success');
      setFormData({ name: '', username: '', password: '', role_id: '2' });
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      alert("Error: " + err.message);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add New Staff Member</h2>
            <p className="text-slate-500 text-sm">Create credentials for your employees</p>
          </div>
        </div>

        {status === 'success' && (
          <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2">
            <CheckCircle size={20} /> Staff member created successfully! They can now log in.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Kasun Perera"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
              <select 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={formData.role_id}
                onChange={e => setFormData({...formData, role_id: e.target.value})}
              >
                <option value="2">Waiter</option>
                <option value="3">Kitchen Staff</option>
                <option value="4">Cashier</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">System Username</label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. kasun_waiter"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Set a password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} /> {status === 'loading' ? 'Creating...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffManagement;