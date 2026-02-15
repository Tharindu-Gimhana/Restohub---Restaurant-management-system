import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Users, 
  TrendingUp, 
  LogOut,
  Settings,
  ChevronLeft
} from 'lucide-react';

// Import the sub-components
import AdminOverview from '../components/AdminOverview';
import StaffManagement from '../components/StaffManagement';
import Reports from '../components/Reports';
import WaiterDashboard from '../components/WaiterDashboard';
import KitchenDashboard from '../components/KitchenDashboard';
import CashierDashboard from '../components/CashierDashboard';
import MenuManagement from '../components/MenuManagement';
import { useOrderContext } from '@/Context/OrderContext';

const Dashboard = ({ user, onLogout }) => {


  // DEBUGGING: Check these values in your browser console
  console.log("Current Role:", user?.role || user?.role_name); 
  const location = useLocation();
  const currentRole = (user?.role_name || user?.role || '').toUpperCase();

  


  // 2. GET CONTEXT VALUES
  // These control the sidebar when a Waiter is taking an order
  const { 
    isOrderMode, 
    setIsOrderMode, 
    categories, 
    selectedCategory, 
    setSelectedCategory 
  } = useOrderContext();

  
  console.log("Is Order Mode?", isOrderMode);
  console.log("Categories in Context:", categories);


  
  
  
  // 1. Define Admin Navigation Links
  const adminLinks = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Staff Management', path: '/dashboard/staff', icon: Users },
    { label: 'Reports & Analytics', path: '/dashboard/reports', icon: TrendingUp },
    { label: 'Menu Management', path: '/dashboard/menu', icon: UtensilsCrossed },
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
                <p className="text-xs text-slate-400">Rest. ID: #{user.restaurantId}</p>
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-bold">
            <LogOut size={16} /> Logout
          </button>
        </div>




        {/*new part for control the new order section of the  waiter panel */}
        {/* ================================================= */}
          {/* SCENARIO 2: WAITER MENU (Dynamic Categories) */}
          {/* ================================================= */}
          {currentRole === 'WAITER' && isOrderMode && (
            <nav className="space-y-1 animate-fadeIn">
              <div className="px-2 mb-4">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                   Menu Categories
                 </p>
              </div>

              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all flex justify-between items-center ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white font-bold shadow-md transform scale-105'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </button>
              ))}

              {/* Exit Order Mode Button */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <button 
                  onClick={() => setIsOrderMode(false)}
                  className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-slate-800 px-4 py-3 rounded-lg transition-colors font-medium text-sm"
                >
                  <ChevronLeft size={16} />
                  Back to Orders
                </button>
              </div>
            </nav>
          )}
          
          {/* Helper text if Waiter is NOT in order mode */}
          {currentRole === 'WAITER' && !isOrderMode && (
             <div className="mt-10 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 text-center">
                   Click <strong>"New Order"</strong> on your dashboard to view menu categories here.
                </p>
             </div>
          )}

     












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
              <Route path="/menu" element={<MenuManagement />} /> {/* <--- Added Route */}
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