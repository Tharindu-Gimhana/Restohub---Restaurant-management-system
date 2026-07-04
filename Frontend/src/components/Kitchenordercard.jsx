import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, ChefHat, Circle, SquareCheckBig } from 'lucide-react';
import { db } from '../services/db';

const KitchenOrderCard = ({ order, onRefresh }) => {
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedItemIds([]);
  }, [order.id, order.items]);

  // 1. Safety Check
  const items = order.items || [];
  if (items.length === 0) return null;

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const statusWeight = { PENDING: 0, READY: 1, SERVED: 2 };
      const statusDiff = (statusWeight[a.status] ?? 99) - (statusWeight[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;

      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      return timeA - timeB;
    });
  }, [items]);

  const readyItems = sortedItems.filter(item => item.status === 'READY');

  const toggleItem = (itemId) => {
    setSelectedItemIds(prev => (
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    ));
  };

  const submitReadyItems = async () => {
    if (selectedItemIds.length === 0) return;

    try {
      setSubmitting(true);
      await db.updateOrderItemStatus(order.id, selectedItemIds, 'READY');
      setSelectedItemIds([]);
      if (onRefresh) onRefresh();
    } catch (error) {
      alert(error.message || 'Failed to update selected items');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Status Helpers
  const isCooking = order.status === 'COOKING';
  const isReady = order.status === 'READY';

  const pendingCount = sortedItems.filter(item => item.status === 'PENDING').length;

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
         const isReadyItem = item.status === 'READY';
         const isServedItem = item.status === 'SERVED';
         const isSelected = selectedItemIds.includes(item.id);
         const isSelectable = item.status === 'PENDING';

          return (
            <div 
              key={item.id} 
            className={`flex justify-between items-center p-3 border-b border-dashed border-slate-100 transition-colors ${
              isServedItem ? 'bg-emerald-50' : isReadyItem ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : isSelected ? 'bg-amber-50 border-l-4 border-l-amber-400' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
             {isSelectable ? (
               <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                  isSelected ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'
                } cursor-pointer`}
               >
                {isSelected ? <CheckCircle size={14} /> : <Circle size={14} />}
               </button>
             ) : (
               <div className={`w-5 h-5 flex items-center justify-center rounded-full ${
                 isServedItem ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'
               }`}>
                 {isServedItem || isReadyItem ? <CheckCircle size={14} /> : <Circle size={14} />}
               </div>
             )}

             <span className={`font-bold text-sm px-2 py-1 rounded ${
               isServedItem ? 'bg-emerald-200 text-emerald-800' : isReadyItem ? 'bg-emerald-200 text-emerald-800' : isSelected ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'
             }`}>
               {item.quantity}x
             </span>

                <div className="flex flex-col">
               <span className={`text-sm ${isReadyItem || isServedItem ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {item.name}
                   </span>
               {isServedItem ? (
                 <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                   <SquareCheckBig size={10} /> SERVED
                 </span>
               ) : isReadyItem ? (
                 <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                   <CheckCircle size={10} /> READY
                 </span>
               ) : isSelected ? (
                 <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                   <Clock size={10} /> SELECTED
                 </span>
               ) : (
                 <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                   <Clock size={10} /> WAITING
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
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
         <span>{pendingCount} pending item{pendingCount === 1 ? '' : 's'}</span>
         <span>{readyItems.length} ready</span>
        </div>

        {selectedItemIds.length > 0 && (
          <button 
           onClick={submitReadyItems}
           disabled={submitting}
           className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-md active:scale-95"
          >
           <CheckCircle size={18} /> {submitting ? 'Submitting...' : 'Submit Selected Items'}
          </button>
        )}
      </div>

    </div>
  );
};

export default KitchenOrderCard;