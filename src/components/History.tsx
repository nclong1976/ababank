import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ShieldCheck, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../lib/socket';
import Receipt from './Receipt';

interface HistoryProps {
  type: 'receive' | 'send';
  onBack: () => void;
  currentUserId: string;
}

interface Transaction {
  id: string;
  type: 'receive' | 'send';
  amount: number;
  currency: string;
  partyName: string;
  partyAccountNo: string;
  createdAt: string;
  note?: string;
  balanceAfter?: number;
}

export default function History({ type, onBack, currentUserId }: HistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | 'USD' | 'KHR'>('ALL');

  const fetchTransactions = () => {
    fetch(`/api/user/${currentUserId}/transactions`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.transactions)) {
          setTransactions(data.transactions.filter((t: any) => t.type === type));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTransactions();

    socket.on('balance_update', () => {
      fetchTransactions();
    });

    return () => {
      socket.off('balance_update');
    };
  }, [type]);

  const formatAmount = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeString = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    return `${dateString} | ${timeString}`;
  };

  const filteredTransactions = useMemo(() => {
    if (filterCurrency === 'ALL') return transactions;
    return transactions.filter(t => t.currency === filterCurrency);
  }, [transactions, filterCurrency]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-50 bg-[#005c7a] flex flex-col font-sans"
    >
      <AnimatePresence>
        {selectedTx && (
          <Receipt 
            amount={selectedTx.amount.toString()}
            currency={selectedTx.currency as 'USD' | 'KHR'}
            recipientName={selectedTx.partyName}
            recipientAccount={selectedTx.partyAccountNo}
            transactionId={selectedTx.id}
            transactionDate={selectedTx.createdAt}
            remainingBalance={selectedTx.balanceAfter}
            type={selectedTx.type as 'send' | 'receive'}
            onBack={() => setSelectedTx(null)}
          />
        )}
      </AnimatePresence>

      <header className="flex items-center p-4 pt-10 text-white relative bg-[#005c7a]">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-colors z-10">
          <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-medium tracking-wide flex-1 text-center absolute inset-0 flex items-center justify-center pt-10 font-sans">
          {type === 'receive' ? 'Receive History' : 'Send History'}
        </h1>
      </header>

      <div className="flex-1 bg-gray-50 rounded-t-3xl overflow-hidden flex flex-col">
        <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-gray-800 font-bold text-[15px] font-sans">Recent Transactions</h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
             <button
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${filterCurrency === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                onClick={() => setFilterCurrency('ALL')}
             >
               All
             </button>
             <button
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${filterCurrency === 'USD' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                onClick={() => setFilterCurrency('USD')}
             >
               USD
             </button>
             <button
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${filterCurrency === 'KHR' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                onClick={() => setFilterCurrency('KHR')}
             >
               KHR
             </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center p-4 text-slate-400 font-sans">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex justify-center p-4 text-slate-400 font-sans">No transactions found</div>
          ) : (
            filteredTransactions.map((t, idx) => (
              <motion.div 
                key={t.id + idx} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileTap={{ scale: 0.98 }}
                className="flex justify-between items-center p-4 rounded-2xl shadow-sm bg-white cursor-pointer transition-transform"
                onClick={() => setSelectedTx(t)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${type === 'receive' ? 'bg-[#e0f2f1]' : 'bg-[#ffebee]'}`}>
                    {type === 'receive' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#00bcd4]"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#ff5252]"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 tracking-tight flex items-center gap-1 text-[15px]">
                      {t.partyName}
                      {(t.partyName === 'ABA SYSTEM' || t.partyName === 'ADMIN TOP UP') && (
                        <ShieldCheck className={`w-4 h-4 ${t.partyName === 'ADMIN TOP UP' ? 'text-amber-500' : 'text-[#00bcd4]'}`} />
                      )}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">Time: {formatTime(t.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-black text-[16px] tracking-tight ${type === 'receive' ? 'text-[#007baf]' : 'text-[#ff5252]'}`}>
                    {type === 'receive' ? '+' : '-'}{t.currency === 'USD' ? '$' : ''}{formatAmount(t.amount)}{t.currency === 'KHR' ? ' ៛' : ''}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${t.partyName === 'ADMIN TOP UP' ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${t.partyName === 'ADMIN TOP UP' ? 'text-amber-600' : 'text-green-600'}`}>
                      {t.partyName === 'ADMIN TOP UP' ? 'SYSTEM REWARD' : 'SUCCESS'}
                    </span>
                  </div>
                  {t.balanceAfter !== undefined && (
                    <span className="text-[10px] text-gray-400 font-bold mt-0.5 tracking-tighter">
                       BAL: {t.currency === 'USD' ? '$' : ''}{formatAmount(t.balanceAfter)}{t.currency === 'KHR' ? ' ៛' : ''}
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
