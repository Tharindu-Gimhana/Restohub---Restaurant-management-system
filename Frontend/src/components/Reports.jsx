import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';



const Reports = () => {
  const [data, setData] = useState(null);

//New part for currency symbol

  const [currency, setCurrency] = useState(localStorage.getItem('currency') || '$');

  useEffect(() => {
    // 1. Create a function to check storage and update state
    const checkCurrency = () => {
      setCurrency(localStorage.getItem('currency') || '$');
    };

    // 2. Listen for the 'storage' event (the "shout" from AdminOverview)
    window.addEventListener('storage', checkCurrency);

    // 3. Cleanup listener when component unmounts
    return () => {
      window.removeEventListener('storage', checkCurrency);
    };
  }, []);





  useEffect(() => {
    const loadData = async () => {
      try {
        const reportData = await db.getReports();
        setData(reportData);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  if (!data) return <div className="p-8 text-center">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Performance Reports</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Income Card */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <p className="opacity-80 mb-1">Total Verified Revenue</p>
          <h3 className="text-4xl font-bold">{currency}{Number(data.revenue).toFixed(2)}</h3>
          <p className="text-sm opacity-80 mt-2">From {data.totalOrders} completed orders</p>
        </div>

        {/* Most Sold Items Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-4">Top 5 Selling Items</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topItems}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="sold" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;