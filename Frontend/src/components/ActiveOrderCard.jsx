import React from 'react';
import { Clock, CheckCircle, XCircle, Plus, Edit3, Lock, ChefHat } from 'lucide-react';

const ActiveOrderCard = ({ order, currency, onCancel, onAddItems, onServe }) => {
  const isReady = order.status === 'READY';
  const isCooking = order.status === 'COOKING';
  const isPending = order.status === 'PENDING';

  // --- BATCHING LOGIC ---
  // Groups items based on time difference (2 minutes rule)
  const groupItemsByBatch = (items) => {
    if (!items || items.length === 0) return {};
    
    // Sort oldest first
    const sorted = [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Safety: If no created_at, treat all as one batch
    if (!sorted[0]?.created_at) return { 'Items': sorted };

    const baseTime = new Date(sorted[0].created_at).getTime();
    const batches = { 'Original Order': [] };

    sorted.forEach(item => {
      const itemTime = new Date(item.created_at).getTime();
      // If item added > 2 mins (120000ms) after start -> It's an update
      if (itemTime - baseTime > 120000) {
        const timeString = new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const batchName = `Update (${timeString})`;
        if (!batches[batchName]) batches[batchName] = [];
        batches[batchName].push(item);
      } else {
        batches['Original Order'].push(item);
      }
    });
    return batches;
  };

  const batches = groupItemsByBatch(order.items);
  const hasUpdates = Object.keys(batches).length > 1;

  return (
    <div className={`bg-white rounded-xl border shadow-sm flex flex-col h-full transition-all duration-300 ${
        isReady ? 'border-green-500 ring-1 ring-green-500' : 
        isCooking ? 'border-orange-300 ring-1 ring-orange-200' : 
        'border-slate-200'
    }`}>
      
      {/* HEADER */}
      <div className={`p-4 border-b flex justify-between items-start ${
          isReady ? 'bg-green-50' : isCooking ? 'bg-orange-50' : 'bg-slate-50'
      }`}>
        <div>
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Table</span>
              {hasUpdates && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    UPDATED
                  </span>
              )}
           </div>
           <h3 className="text-3xl font-black text-slate-800">{order.table_number}</h3>
        </div>
        
        <div className="flex flex-col items-end gap-1">
           <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm ${
              isReady ? 'bg-green-100 text-green-700' : 
              isCooking ? 'bg-orange-100 text-orange-700' :
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
         {Object.entries(batches).map(([batchName, batchItems]) => (
            <div key={batchName} className="animate-fadeIn">
               <div className="flex justify-between items-end border-b border-slate-100 pb-1 mb-2">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                   {batchName}
                 </p>
               </div>
               {batchItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm mb-2 last:mb-0">
                     <span className="text-slate-700 font-medium">
                        <span className="inline-block font-bold text-slate-900 bg-slate-100 px-1.5 rounded text-xs mr-2 w-6 text-center">
                            {item.quantity}x
                        </span> 
                        {item.name}
                     </span>
                     <span className="text-xs text-slate-400 tabular-nums">{currency}{item.price}</span>
                  </div>
               ))}
            </div>
         ))}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
         <div className="flex justify-between items-center mb-3">
             <span className="text-xs text-slate-500 font-bold uppercase">Total Bill</span>
             <span className="text-xl font-bold text-slate-800">{currency}{Number(order.total).toFixed(2)}</span>
         </div>

         <div className="grid grid-cols-2 gap-2">
            {/* 1. CANCEL (Only PENDING) */}
            {isPending ? (
               <button 
                 onClick={() => onCancel(order.id)}
                 className="col-span-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
               >
                 <XCircle size={14} /> Cancel
               </button>
            ) : (
               // If Cooking/Ready, Cancel is Locked
               <button disabled className="col-span-1 bg-slate-100 text-slate-400 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-not-allowed border border-slate-200">
                  <Lock size={12} /> Locked
               </button>
            )}

            {/* 2. UPDATE (Allowed unless READY) */}
            {!isReady ? (
               <button 
                 onClick={() => onAddItems(order)}
                 className="col-span-1 bg-indigo-600 text-white hover:bg-indigo-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
               >
                 {isPending ? <Edit3 size={14} /> : <Plus size={14} />} 
                 {isPending ? 'Edit' : 'Add Item'}
               </button>
            ) : (
               // If Ready -> Serve
               <button 
                 onClick={() => onServe(order.id)}
                 className="col-span-1 bg-green-600 text-white hover:bg-green-700 py-2 rounded-lg text-xs font-bold shadow-sm"
               >
                  Mark Served
               </button>
            )}
         </div>
      </div>
    </div>
  );
};

export default ActiveOrderCard;