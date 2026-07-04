import React, { useMemo } from 'react';
import { XCircle } from 'lucide-react';

const BillingDialog = ({ order, currency, paymentMethod, onPaymentMethodChange, onClose, onComplete }) => {
  const billingSummary = useMemo(() => {
    if (!order) return { itemCount: 0, total: 0 };
    return {
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      total: Number(order.total || 0)
    };
  }, [order]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Billing Interface</p>
            <h3 className="text-xl font-bold text-slate-800">Table #{order.table_number}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <XCircle size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Order Summary</h4>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                  </div>
                      <p className="font-bold text-slate-700">{currency}{Number(item.subtotal ?? (Number(item.price || 0) * Number(item.quantity || 0))).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900 text-white p-5">
              <p className="text-sm text-slate-300">Total Bill</p>
              <p className="text-4xl font-black mt-2">{currency}{billingSummary.total.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">{billingSummary.itemCount} items</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Payment Method</h4>
              <div className="grid grid-cols-3 gap-2">
                {['Cash', 'Card', 'Mobile'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onPaymentMethodChange(method)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                      paymentMethod === method
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onComplete}
              className="w-full rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 transition-colors"
            >
              Complete Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingDialog;