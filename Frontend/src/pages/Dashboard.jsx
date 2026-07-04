import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Users, 
  TrendingUp, 
  LogOut,
  Settings,
  ChevronLeft,
  Menu // <-- Added for the toggle button
} from 'lucide-react';

import {  useEffect } from 'react';

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
  // --- NEW: Sidebar State ---
  const [isCollapsed, setIsCollapsed] = useState(true);

  // DEBUGGING: Check these values in your browser console
  console.log("Current Role:", user?.role || user?.role_name); 
  const location = useLocation();
  const currentRole = (user?.role_name || user?.role || '').toUpperCase();

  // GET CONTEXT VALUES
  const { 
    isOrderMode, 
    setIsOrderMode, 
    categories, 
    selectedCategory, 
    setSelectedCategory 
  } = useOrderContext();
  
  console.log("Is Order Mode?", isOrderMode);
  console.log("Categories in Context:", categories);

  
  
  // --- NEW CODE: Auto-expand sidebar when "New Order" is clicked ---
  {useEffect(() => {
    if (isOrderMode) {
      setIsCollapsed(false); }// Force the sidebar to open  
    else {
      setIsCollapsed(true); // Collapse the sidebar when not in order mode  
    }
  }, [isOrderMode]); }
  // ----------------------------------------------------------------

  // Define Admin Navigation Links
  const adminLinks = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Staff Management', path: '/dashboard/staff', icon: Users },
    { label: 'Reports & Analytics', path: '/dashboard/reports', icon: TrendingUp },
    { label: 'Menu Management', path: '/dashboard/menu', icon: UtensilsCrossed },
  ];

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      {/* Added smooth width transitions: w-64 for expanded, w-20 for collapsed */}
      <aside 
        className={`bg-slate-900 text-slate-300 fixed h-full z-50 transition-all duration-300 ease-in-out flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          
          {/* Header & Toggle Button */}
          <div className={`flex items-center mb-8 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-2 text-white font-bold text-xl transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              <UtensilsCrossed className="text-indigo-500" />
              <span>RestoHub</span>
            </div>
            
            {/* Toggle Button */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors shrink-0"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Render Links ONLY if user is ADMIN */}
          {currentRole === 'ADMIN' && (
            <nav className="space-y-2">
              {adminLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center py-3 rounded-lg transition-all duration-200 ${
                      isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'
                    } ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                    title={isCollapsed ? link.label : ""}
                  >
                    <link.icon size={20} className="shrink-0" />
                    <span className={`whitespace-nowrap transition-all duration-300 ${
                      isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
                    }`}>
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* WAITER MENU (Dynamic Categories) */}
          {currentRole === 'WAITER' && isOrderMode && (
            <nav className="space-y-2 animate-fadeIn mt-4">
              <div className={`mb-4 transition-all ${isCollapsed ? 'text-center' : 'px-2'}`}>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                   {isCollapsed ? 'Menu' : 'Menu Categories'}
                 </p>
              </div>

              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  title={isCollapsed ? cat : ""}
                  className={`w-full py-3 rounded-lg transition-all flex items-center ${
                    isCollapsed ? 'justify-center px-0' : 'justify-between px-4'
                  } ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white font-bold shadow-md transform scale-105'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {/* If collapsed, show the first letter of the category. If expanded, show full word */}
                  <span className={`whitespace-nowrap ${isCollapsed ? 'text-lg font-black' : ''}`}>
                    {isCollapsed ? cat.charAt(0).toUpperCase() : cat}
                  </span>
                  
                  {!isCollapsed && selectedCategory === cat && (
                    <div className="w-2 h-2 bg-white rounded-full shrink-0"></div>
                  )}
                </button>
              ))}

              {/* Exit Order Mode Button */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <button 
                  onClick={() => setIsOrderMode(false)}
                  title={isCollapsed ? "Back" : ""}
                  className={`w-full flex items-center text-red-400 hover:text-red-300 hover:bg-slate-800 py-3 rounded-lg transition-colors font-medium text-sm ${
                    isCollapsed ? 'justify-center px-0' : 'gap-2 px-4'
                  }`}
                >
                  <ChevronLeft size={20} className="shrink-0" />
                  <span className={`whitespace-nowrap transition-all duration-300 ${
                    isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
                  }`}>
                    Back to Orders
                  </span>
                </button>
              </div>
            </nav>
          )}
          
          {/* Helper text if Waiter is NOT in order mode */}
          {currentRole === 'WAITER' && !isOrderMode && !isCollapsed && (
             <div className="mt-10 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 text-center">
                   Click <strong>"New Order"</strong> on your dashboard to view menu categories here.
                </p>
             </div>
          )}
        </div>

        {/* --- User Profile at Bottom --- */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 mb-4'}`}>
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0 shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            <div className={`overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
            }`}>
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400">Rest. ID: #{user.restaurantId}</p>
            </div>
          </div>

          <button 
            onClick={onLogout} 
            title={isCollapsed ? "Logout" : ""}
            className={`w-full flex items-center text-red-400 hover:text-red-300 text-sm font-bold transition-all ${
              isCollapsed ? 'justify-center mt-4' : 'gap-2'
            }`}
          >
            <LogOut size={isCollapsed ? 20 : 16} className="shrink-0" /> 
            <span className={`whitespace-nowrap transition-all duration-300 ${
              isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
            }`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      {/* Added smooth margin transitions to match the sidebar width */}
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {currentRole === 'ADMIN' ? 'Owner Dashboard' : `${currentRole} Panel`}
          </h2>
          <div className="bg-white p-2 rounded-full shadow-sm cursor-pointer hover:bg-slate-100 transition-colors">
            <Settings size={20} className="text-slate-500" />
          </div>
        </header>

        {/* Dynamic Content Switching */}
        <div className="animate-fadeIn">
          <Routes>
            {/* Admin Routes */}
            {currentRole === 'ADMIN' && (
              <>
                <Route path="/" element={<AdminOverview user={user} />} />
                <Route path="/staff" element={<StaffManagement />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/menu" element={<MenuManagement />} />
              </>
            )}

            {/* Staff Routes */}
            {currentRole === 'WAITER' && <Route path="/" element={<WaiterDashboard user={user} />} />}
            {currentRole === 'KITCHEN' && <Route path="/" element={<KitchenDashboard />} />}
            {currentRole === 'CASHIER' && <Route path="/" element={<CashierDashboard />} />}
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;