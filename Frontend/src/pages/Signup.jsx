import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../services/db'; 
import { Store, User, Mail, Lock, ArrowRight } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    restaurantName: '',
    username: '', // This will be the Admin Username
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await db.registerOwner(formData);
      alert('Registration Successful! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Side Banner (Visual) */}
        <div className="bg-indigo-600 p-8 md:w-1/3 flex flex-col justify-center items-center text-center text-white">
          <Store size={48} className="mb-4 text-indigo-200" />
          <h2 className="text-2xl font-bold mb-2">Partner with RestoHub</h2>
          <p className="text-indigo-100 text-sm opacity-90">Manage your restaurant efficiently with our all-in-one platform.</p>
        </div>

        {/* Form Section */}
        <div className="p-8 md:w-2/3">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Create Account</h2>
          
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-2 rounded text-xs text-center border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Restaurant Name</label>
              <div className="relative">
                <Store size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  name="restaurantName"
                  type="text" 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="e.g. Colombo Crab House"
                  value={formData.restaurantName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    name="username"
                    type="text" 
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    placeholder="create_username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    name="email"
                    type="email" 
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    placeholder="owner@mail.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  name="password"
                  type="password" 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Creating...' : <>{'Get Started'} <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:underline">Log in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;