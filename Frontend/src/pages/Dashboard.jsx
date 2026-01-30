import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Flame, 
  Receipt, 
  Settings, 
  LogOut,
  Package,
  TrendingUp,
  Table as TableIcon
} from 'lucide-react';
import AdminDashboard from '../components/AdminDashboard';
import WaiterDashboard from '../components/WaiterDashboard';
import KitchenDashboard from '../components/KitchenDashboard';
import CashierDashboard from '../components/CashierDashboard';

const Dashboard = ({ user, onLogout }) => {
  const location = useLocation();

  const getSidebarLinks = () => {
    const base = '/dashboard';
    switch (user.role) {
      case UserRole.ADMIN:
        return [
          { label: 'Overview', path: base, icon: LayoutDashboard },
          { label: 'Menu Management', path: `${base}/menu`, icon: UtensilsCrossed },
          { label: 'Inventory', path: `${base}/inventory`, icon: Package },
          { label: 'Reports', path: `${base}/reports`, icon: TrendingUp },
        ];
      case UserRole.WAITER:
        return [
          { label: 'Tables', path: base, icon: TableIcon },
          { label: 'My Orders', path: `${base}/orders`, icon: Receipt },
        ];
      case UserRole.KITCHEN:
        return [
          { label: 'Active Orders', path: base, icon: Flame },
        ];
      case UserRole.CASHIER:
        return [
          { label: 'Billing', path: base, icon: Receipt },
        ];
      default:
        return [];
    }
  };

  const navLinks = getSidebarLinks();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 fixed h-full z-50 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-2 text-white font-bold text-xl mb-8">
            <UtensilsCrossed className="text-indigo-400" />
            <span>RestoHub</span>
          </div>
          
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Logged in as</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {user.role === UserRole.ADMIN ? 'Admin Control Center' : 
               user.role === UserRole.WAITER ? 'Service Dashboard' :
               user.role === UserRole.KITCHEN ? 'Kitchen Workflow' : 'Billing & Cashier'}
            </h2>
            <p className="text-slate-500">Welcome back, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <Settings size={20} className="text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" />
            </div>
          </div>
        </header>

        <div className="content-area">
          <Routes>
            <Route path="/" element={
              user.role === UserRole.ADMIN ? <AdminDashboard /> :
              user.role === UserRole.WAITER ? <WaiterDashboard user={user} /> :
              user.role === UserRole.KITCHEN ? <KitchenDashboard /> : <CashierDashboard />
            } />
            <Route path="/menu" element={user.role === UserRole.ADMIN ? <AdminDashboard view="menu" /> : <Navigate to="/" />} />
            <Route path="/inventory" element={user.role === UserRole.ADMIN ? <AdminDashboard view="inventory" /> : <Navigate to="/" />} />
            <Route path="/reports" element={user.role === UserRole.ADMIN ? <AdminDashboard view="reports" /> : <Navigate to="/" />} />
            <Route path="/orders" element={user.role === UserRole.WAITER ? <WaiterDashboard user={user} view="orders" /> : <Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;