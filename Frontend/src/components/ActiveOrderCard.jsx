import React, { useEffect, useMemo, useState } from 'react';
import { Clock, CheckCircle, XCircle, Plus, Edit3, Lock, ChefHat } from 'lucide-react';

const ActiveOrderCard = ({ order, currency, onCancel, onAddItems, onServe, onCheckout }) => {
   const [selectedReadyItems, setSelectedReadyItems] = useState([]);
   const isBilling = order.status === 'BILLING';
   const isPaid = order.status === 'PAID';
  const isReady = order.status === 'READY';
  const isCooking = order.status === 'COOKING';
  const isPending = order.status === 'PENDING';

   useEffect(() => {
      setSelectedReadyItems([]);
   }, [order.id, order.items]);

   const sortedItems = useMemo(() => {
      const statusWeight = { READY: 0, SERVED: 1, PENDING: 2 };
      return [...(order.items || [])].sort((a, b) => {
         const statusDiff = (statusWeight[a.status] ?? 99) - (statusWeight[b.status] ?? 99);
         if (statusDiff !== 0) return statusDiff;

         const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
         const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
         return timeB - timeA;
      });
   }, [order.items]);

   const readyItems = sortedItems.filter(item => item.status === 'READY');
   const servedItems = sortedItems.filter(item => item.status === 'SERVED');
   const pendingItems = sortedItems.filter(item => item.status !== 'READY' && item.status !== 'SERVED');
   const allItemsServed = sortedItems.length > 0 && sortedItems.every(item => item.status === 'SERVED');

   const toggleReadyItem = (itemId) => {
      setSelectedReadyItems(prev => (
         prev.includes(itemId)
            ? prev.filter(id => id !== itemId)
            : [...prev, itemId]
      ));
   };

   const serveSelectedItems = () => {
      if (selectedReadyItems.length === 0 || !onServe) return;
      onServe(order.id, selectedReadyItems);
      setSelectedReadyItems([]);
   };

  return (
    <div className={`bg-white rounded-xl border shadow-sm flex flex-col h-full transition-all duration-300 ${
        isReady ? 'border-green-500 ring-1 ring-green-500' : 
        isCooking ? 'border-orange-300 ring-1 ring-orange-200' : 
        'border-slate-200'
    }`}>
      
      {/* HEADER */}
      <div className={`p-4 border-b flex justify-between items-start ${
           isReady ? 'bg-green-50' : isCooking ? 'bg-orange-50' : isBilling ? 'bg-indigo-50' : 'bg-slate-50'
      }`}>
        <div>
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Table</span>
                     {readyItems.length > 0 && (
                           <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                              {readyItems.length} READY
                  </span>
              )}
           </div>
           <h3 className="text-3xl font-black text-slate-800">{order.table_number}</h3>
        </div>
        
        <div className="flex flex-col items-end gap-1">
           <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm ${
              isReady ? 'bg-green-100 text-green-700' : 
              isCooking ? 'bg-orange-100 text-orange-700' :
              isBilling ? 'bg-indigo-100 text-indigo-700' :
              'bg-slate-200 text-slate-600'
           }`}>
              {isReady ? <CheckCircle size={14}/> : isCooking ? <ChefHat size={14}/> : <Clock size={14}/>}
              {order.status}
           </span>
           <span className="text-[10px] text-slate-400 font-mono">
             #{order.id}
           </span>
        </div>
      </div>

      {/* BODY (SCROLLABLE BATCHES) */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-64 custom-scrollbar">
         {readyItems.length > 0 && !isBilling && !isPaid && (
            <div>
               <div className="flex justify-between items-end border-b border-emerald-100 pb-1 mb-2">
                 <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                   Ready to serve
                 </p>
                 <span className="text-[10px] text-emerald-500 font-bold">Select items to serve</span>
               </div>
               {readyItems.map((item) => {
                  const isSelected = selectedReadyItems.includes(item.id);
                  return (
                     <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleReadyItem(item.id)}
                        className={`w-full flex justify-between items-center text-sm mb-2 last:mb-0 p-2 rounded-lg border transition-colors ${
                          isSelected ? 'bg-emerald-100 border-emerald-400' : 'bg-white border-emerald-100 hover:bg-emerald-50'
                        }`}
                     >
                        <span className="text-slate-800 font-medium flex items-center gap-2">
                           <CheckCircle size={14} className="text-emerald-600" />
                           <span className="inline-block font-bold text-emerald-800 bg-emerald-50 px-1.5 rounded text-xs w-6 text-center">
                              {item.quantity}x
                           </span>
                           {item.name}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">
                          {isSelected ? 'SELECTED' : 'READY'}
                        </span>
                     </button>
                  );
               })}
            </div>
         )}

         {servedItems.length > 0 && (
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Served</p>
               {servedItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm mb-2 last:mb-0 p-2 rounded-lg bg-slate-50 border border-slate-100">
                     <span className="text-slate-500 font-medium flex items-center gap-2">
                        <CheckCircle size={14} className="text-slate-400" />
                        <span className="inline-block font-bold text-slate-500 bg-slate-100 px-1.5 rounded text-xs mr-1 w-6 text-center">
                            {item.quantity}x
                        </span>
                        {item.name}
                     </span>
                     <span className="text-[10px] font-bold text-slate-500">SERVED</span>
                  </div>
               ))}
            </div>
         )}

         {pendingItems.length > 0 && (
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Waiting</p>
               {pendingItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm mb-2 last:mb-0 p-2 rounded-lg bg-slate-50 border border-slate-100 opacity-70">
                     <span className="text-slate-600 font-medium flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="inline-block font-bold text-slate-600 bg-slate-100 px-1.5 rounded text-xs mr-1 w-6 text-center">
                            {item.quantity}x
                        </span>
                        {item.name}
                     </span>
                     <span className="text-[10px] font-bold text-slate-400">PENDING</span>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
         <div className="flex justify-between items-center mb-3">
             <span className="text-xs text-slate-500 font-bold uppercase">Total Bill</span>
             <span className="text-xl font-bold text-slate-800">{currency}{Number(order.total).toFixed(2)}</span>
         </div>

         <div className="grid grid-cols-2 gap-2 mb-2">
            {isPending && (
               <button 
                 onClick={() => onCancel(order.id)}
                 className="bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
               >
                 <XCircle size={14} /> Cancel
               </button>
            )}

            {!isBilling && !isPaid && (
               <button 
                 onClick={() => onAddItems(order)}
                 className="bg-indigo-600 text-white hover:bg-indigo-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
               >
                 {isPending ? <Edit3 size={14} /> : <Plus size={14} />} 
                 Add Item
               </button>
            )}

            {!isBilling && !isPaid && readyItems.length > 0 && (
               <button
                  onClick={serveSelectedItems}
                  disabled={selectedReadyItems.length === 0}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
               >
                  <CheckCircle size={14} /> Serve Selected
               </button>
            )}

            {!isBilling && !isPaid && allItemsServed && (
               <button
                  onClick={() => onCheckout && onCheckout(order.id)}
                  className="bg-slate-900 text-white hover:bg-slate-800 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
               >
                  <ChefHat size={14} /> Checkout
               </button>
            )}
         </div>
      </div>
    </div>
  );
};

export default ActiveOrderCard;