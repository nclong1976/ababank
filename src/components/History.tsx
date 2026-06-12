import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../lib/socket';
import Receipt from './Receipt';

interface HistoryProps {
  type: 'receive' | 'send';
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAccountNo: string;
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

export default function History({ type, onBack, currentUserId, currentUserName, currentUserAccountNo }: HistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | 'USD' | 'KHR'>('ALL');
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(type);

  const fetchTransactions = () => {
    fetch(`/api/user/${currentUserId}/transactions`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    setActiveTab(type);
  }, [type]);

  useEffect(() => {
    fetchTransactions();

    const onBalanceUpdate = () => {
      fetchTransactions();
    };

    socket.on('balance_update', onBalanceUpdate);

    return () => {
      socket.off('balance_update', onBalanceUpdate);
    };
  }, [currentUserId]);

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
    let result = transactions.filter(t => t.type === activeTab);
    if (filterCurrency !== 'ALL') {
      result = result.filter(t => t.currency === filterCurrency);
    }
    return result;
  }, [transactions, activeTab, filterCurrency]);

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
            recipientName={selectedTx.type === 'receive' ? currentUserName : selectedTx.partyName}
            recipientAccount={selectedTx.type === 'receive' ? currentUserAccountNo : selectedTx.partyAccountNo}
            senderName={selectedTx.type === 'receive' ? selectedTx.partyName : currentUserName}
            senderAccount={selectedTx.type === 'receive' ? selectedTx.partyAccountNo : currentUserAccountNo}
            transactionId={selectedTx.id}
            transactionDate={selectedTx.createdAt}
            remainingBalance={selectedTx.balanceAfter}
            type={selectedTx.type as 'send' | 'receive'}
            note={selectedTx.note}
            onBack={() => setSelectedTx(null)}
          />
        )}
      </AnimatePresence>

      <header className="flex flex-col p-4 pt-10 pb-2 text-white bg-[#005c7a] shrink-0 font-sans select-none">
        <div className="flex items-center relative h-10 w-full mb-3">
          <button onClick={onBack} className="absolute left-0 p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-colors z-10">
            <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
          </button>
          <h1 className="text-[19px] font-bold tracking-tight flex-1 text-center font-sans">
            History
          </h1>
        </div>
        
        {/* Segmented Control Tabs */}
        <div className="flex bg-[#004860] p-1 rounded-xl w-full mb-2 relative">
          <motion.div 
            className="absolute top-1 bottom-1 bg-[#00bcd4] rounded-lg shadow-md"
            layoutId="activeTabIndicator"
            animate={{ 
              left: activeTab === 'receive' ? '4px' : 'calc(50% + 2px)',
              right: activeTab === 'receive' ? 'calc(50% + 2px)' : '4px'
            }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
          <button
            onClick={() => setActiveTab('receive')}
            className={`flex-1 py-2 text-[14px] font-bold text-center z-10 relative transition-colors duration-200 ${activeTab === 'receive' ? 'text-white' : 'text-white/60'}`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 text-[14px] font-bold text-center z-10 relative transition-colors duration-200 ${activeTab === 'send' ? 'text-white' : 'text-white/60'}`}
          >
            Sent
          </button>
        </div>
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
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activeTab === 'receive' ? 'bg-[#e0f2f1]' : 'bg-[#ffebee]'}`}>
                    {activeTab === 'receive' ? (
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
                  <span className={`font-black text-[16px] tracking-tight ${activeTab === 'receive' ? 'text-[#007baf]' : 'text-[#ff5252]'}`}>
                    {activeTab === 'receive' ? '+' : '-'}{t.currency === 'USD' ? '$' : ''}{formatAmount(t.amount)}{t.currency === 'KHR' ? ' ៛' : ''}
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
