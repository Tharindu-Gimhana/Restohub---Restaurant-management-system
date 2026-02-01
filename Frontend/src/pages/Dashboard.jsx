import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Users, 
  TrendingUp, 
  LogOut,
  Settings
} from 'lucide-react';

// Import the sub-components
import AdminOverview from '../components/AdminOverview';
import StaffManagement from '../components/StaffManagement';
import Reports from '../components/Reports';
import WaiterDashboard from '../components/WaiterDashboard';
import KitchenDashboard from '../components/KitchenDashboard';
import CashierDashboard from '../components/CashierDashboard';

const Dashboard = ({ user, onLogout }) => {
  const location = useLocation();
  const currentRole = (user?.role_name || user?.role || '').toUpperCase();

  // 1. Define Admin Navigation Links
  const adminLinks = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Staff Management', path: '/dashboard/staff', icon: Users },
    { label: 'Reports & Analytics', path: '/dashboard/reports', icon: TrendingUp },
    // You can add Menu management back here if needed
  ];

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 text-slate-300 fixed h-full z-50">
        <div className="p-6">
          <div className="flex items-center gap-2 text-white font-bold text-xl mb-8">
            <UtensilsCrossed className="text-indigo-500" />
            <span>RestoHub</span>
          </div>

          {/* Render Links ONLY if user is ADMIN */}
          {currentRole === 'ADMIN' && (
            <nav className="space-y-1">
              {adminLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
                    }`}
                  >
                    <link.icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* User Profile at Bottom */}
        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800 bg-slate-900">
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Logged in as</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400">Rest. ID: #{user.restaurant_id}</p>
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-bold">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {currentRole === 'ADMIN' ? 'Owner Dashboard' : `${currentRole} Panel`}
          </h2>
          <div className="bg-white p-2 rounded-full shadow-sm cursor-pointer">
            <Settings size={20} className="text-slate-400" />
          </div>
        </header>

        {/* Dynamic Content Switching */}
        <Routes>
          {/* Admin Routes */}
          {currentRole === 'ADMIN' && (
            <>
              <Route path="/" element={<AdminOverview user={user} />} />
              <Route path="/staff" element={<StaffManagement />} />
              <Route path="/reports" element={<Reports />} />
            </>
          )}

          {/* Staff Routes */}
          {currentRole === 'WAITER' && <Route path="/" element={<WaiterDashboard user={user} />} />}
          {currentRole === 'KITCHEN' && <Route path="/" element={<KitchenDashboard />} />}
          {currentRole === 'CASHIER' && <Route path="/" element={<CashierDashboard />} />}
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;