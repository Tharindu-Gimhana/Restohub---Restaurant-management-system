import React from 'react';
import { CheckCircle, Clock, ChefHat, AlertCircle } from 'lucide-react';

const KitchenOrderCard = ({ order, onUpdateStatus }) => {
  // 1. Safety Check
  const items = order.items || [];
  if (items.length === 0) return null;

  // 2. Safely parse and sort timestamps
  const sortedItems = [...items].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  // Base time is the timestamp of the OLDEST item
  const baseTime = sortedItems[0]?.created_at ? new Date(sortedItems[0].created_at).getTime() : 0;

  // 3. Bulletproof "Is New" Helper
  const isNewItem = (itemCreatedAt, itemName) => {
    if (!itemCreatedAt || baseTime === 0) return false; // Fail gracefully if no timestamp
    
    const itemTime = new Date(itemCreatedAt).getTime();
    const diffSeconds = (itemTime - baseTime) / 1000;
    
    // --- DEBUGGING LOG (Check your F12 Console!) ---
    // console.log(`[Item: ${itemName}] Diff from start: ${diffSeconds} seconds`);

    // Threshold: Anything added > 60 seconds (1 minute) after the first item is "NEW"
    return diffSeconds > 60; 
  };

  // 4. Status Helpers
  const isCooking = order.status === 'COOKING';
  const isReady = order.status === 'READY';

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border-2 transition-all ${
      isCooking ? 'border-orange-400 ring-2 ring-orange-100' : 
      isReady ? 'border-green-500 opacity-75' : 'border-slate-200'
    }`}>
      
      {/* --- HEADER --- */}
      <div className={`p-4 flex justify-between items-start border-b ${
        isCooking ? 'bg-orange-50' : 'bg-slate-50'
      }`}>
        <div>
          <h3 className="text-3xl font-black text-slate-800">#{order.table_number}</h3>
          <span className="text-xs font-mono text-slate-500">ID: {order.id}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
           <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              isCooking ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
           }`}>
              {isCooking ? <ChefHat size={14}/> : <Clock size={14}/>}
              {order.status}
           </span>
           <span className="text-xs text-slate-400">
             {order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Time unknown'}
           </span>
        </div>
      </div>

      {/* --- ITEMS LIST --- */}
      <div className="flex-1 p-0 overflow-hidden">
        {sortedItems.map((item, idx) => {
          // Pass the name too, just for our debug log
          const isNew = isNewItem(item.created_at, item.name);

          return (
            <div 
              key={idx} 
              className={`flex justify-between items-center p-3 border-b border-dashed border-slate-100 transition-colors ${
                 isNew ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold text-sm px-2 py-1 rounded ${
                   isNew ? 'bg-yellow-200 text-yellow-800' : 'bg-slate-100 text-slate-700'
                }`}>
                   {item.quantity}x
                </span>

                <div className="flex flex-col">
                   <span className={`text-sm ${isNew ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {item.name}
                   </span>
                   {isNew && (
                      <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1 animate-pulse mt-0.5">
                         <AlertCircle size={10} /> LATE ADDITION
                      </span>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- ACTION FOOTER --- */}
      <div className="p-4 mt-auto border-t bg-slate-50">
        {order.status === 'PENDING' && (
           <button 
             onClick={() => onUpdateStatus(order.id, 'COOKING')}
             className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-md active:scale-95"
           >
             <ChefHat size={18} /> Start Cooking
           </button>
        )}

        {order.status === 'COOKING' && (
           <button 
             onClick={() => onUpdateStatus(order.id, 'READY')}
             className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-md active:scale-95"
           >
             <CheckCircle size={18} /> Mark Ready
           </button>
        )}
      </div>

    </div>
  );
};

export default KitchenOrderCard;