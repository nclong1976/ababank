import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, CircleUser, Scan, MoreHorizontal, ChevronDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../lib/socket';
import Receipt from './Receipt';
import StatusBar from './StatusBar';

interface HistoryProps {
  type: 'receive' | 'send';
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAccountNo: string;
  balances: Record<string, number>;
  activeCurrency: 'USD' | 'KHR';
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

interface GroupedTransactions {
  title: string;
  data: Transaction[];
}

const AvatarIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function History({ 
  onBack, 
  currentUserId, 
  currentUserName, 
  currentUserAccountNo,
  balances,
  activeCurrency
}: HistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

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

  const formatBalance = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCurrentFormattedDate = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(new Date());
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    return `${day}.${month}.${year}`;
  };

  // Filter and group transactions by date
  const groupedTransactions = useMemo(() => {
    // Filter by the active currency to match the account card
    const filtered = transactions.filter(t => t.currency === activeCurrency);
    
    const groups: GroupedTransactions[] = [];
    const map: { [key: string]: number } = {};
    
    const getVNFormatDate = (d: Date) => {
      return d.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    };

    filtered.forEach(tx => {
      const txDate = new Date(tx.createdAt);
      const txDateStr = getVNFormatDate(txDate);
      const todayStr = getVNFormatDate(new Date());
      const yesterdayStr = getVNFormatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      
      let dateKey = '';
      if (txDateStr === todayStr) {
        dateKey = 'TODAY';
      } else if (txDateStr === yesterdayStr) {
        dateKey = 'YESTERDAY';
      } else {
        const day = txDate.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric' });
        const month = txDate.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', month: 'short' }).toUpperCase();
        const year = txDate.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' });
        dateKey = `${day} ${month} ${year}`;
      }
      
      if (map[dateKey] !== undefined) {
        groups[map[dateKey]].data.push(tx);
      } else {
        map[dateKey] = groups.length;
        groups.push({ title: dateKey, data: [tx] });
      }
    });
    
    return groups;
  }, [transactions, activeCurrency]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
            className="absolute inset-0 z-50 bg-[#011e29] flex flex-col font-sans overflow-hidden"
    >
      <StatusBar className="bg-[#011e29]" />
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

      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-2 text-white bg-[#011e29] shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-colors">
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <span className="text-[19px] font-bold tracking-tight">ABA Accounts</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-1 hover:bg-white/10 rounded-full active:scale-95 transition-all">
            <Scan className="w-5 h-5 text-white/90" strokeWidth={2.2} />
          </button>
          <button className="p-1 hover:bg-white/10 rounded-full active:scale-95 transition-all">
            <CircleUser className="w-5.5 h-5.5 text-white/90" strokeWidth={2.2} />
          </button>
          <button className="p-1 hover:bg-white/10 rounded-full active:scale-95 transition-all">
            <MoreHorizontal className="w-6 h-6 text-white/90" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* Card Section */}
      <div className="px-4 pb-4 bg-[#011e29] shrink-0">
        <div className="bg-[#032e3d] rounded-[1.25rem] p-5 shadow-lg border border-white/5 relative overflow-hidden">
          {/* Card Header */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-white/80 font-bold text-[14px]">Savings</span>
              <span className="text-white/30 text-[14px]">|</span>
              <span className="text-white/60 font-medium text-[14px]">{currentUserAccountNo}</span>
            </div>
            {/* Date Badge */}
            <div className="bg-[#0c4b60]/50 border border-white/5 rounded-full px-2.5 py-1 flex items-center gap-1 cursor-pointer hover:bg-[#0c4b60] transition-colors">
              <span className="text-white/90 font-bold text-[11px] tracking-tight">{getCurrentFormattedDate()}</span>
              <ChevronLeft className="w-3 h-3 text-white/80 rotate-180" strokeWidth={3} />
            </div>
          </div>

          {/* Balance */}
          <div className="text-[30px] font-bold text-white tracking-tight leading-none mb-4">
            {formatBalance(balances[activeCurrency] || 0)} {activeCurrency}
          </div>

          {/* Footer Info */}
          <div className="flex items-center gap-1.5 text-white/50 text-[12px] font-medium">
            <span>Total Balance: {formatBalance(balances[activeCurrency] || 0)} {activeCurrency}</span>
            <Info className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Expand/Collapse decoration */}
        <div className="flex justify-center mt-2">
          <ChevronDown className="w-5 h-5 text-white/40 cursor-pointer hover:text-white/70 transition-colors animate-bounce" strokeWidth={3} />
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="flex-1 bg-[#011e29] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8 text-white/40 font-sans text-sm">Loading transactions...</div>
        ) : groupedTransactions.length === 0 ? (
          <div className="flex justify-center p-8 text-white/40 font-sans text-sm">No transactions found</div>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.title} className="w-full">
              {/* Group Header */}
              <div className="bg-[#001720] px-4 py-1.5 text-[#9ea6b5] font-bold text-[12px] tracking-wider font-sans sticky top-0 z-10 select-none uppercase">
                {group.title}
              </div>

              {/* Rows */}
              <div className="w-full">
                {group.data.map((t, idx) => (
                  <motion.div 
                    key={t.id + idx} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex justify-between items-center px-4 py-[14px] bg-[#011e29] border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.02] transition-colors"
                    onClick={() => setSelectedTx(t)}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 relative ${
                        t.type === 'receive' 
                          ? 'border-[#3ac59f]/30 bg-[#3ac59f]/5' 
                          : 'border-[#e55f5c]/30 bg-[#e55f5c]/5'
                      }`}>
                        <AvatarIcon color={t.type === 'receive' ? '#3ac59f' : '#e55f5c'} />
                        {t.type === 'receive' ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#3ac59f] rounded-full flex items-center justify-center border-2 border-[#011e29]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4.5" className="w-2.5 h-2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        ) : (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#e55f5c] rounded-full flex items-center justify-center border-2 border-[#011e29]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4.5" className="w-2.5 h-2.5">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex flex-col justify-center">
                        {t.type === 'receive' ? (
                          <span className="text-white/90 text-[15.5px] font-sans font-normal leading-snug">
                            Paid by <span className="font-bold text-white">{t.partyName}</span>
                          </span>
                        ) : (
                          <span className="text-white font-bold text-[15.5px] font-sans leading-snug">
                            {t.partyName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col items-end justify-center">
                      <span className={`font-bold text-[16px] tracking-normal font-sans ${
                        t.type === 'receive' ? 'text-[#3ac59f]' : 'text-[#e55f5c]'
                      }`}>
                        {t.type === 'receive' ? '+' : '-'}{formatAmount(t.amount)} {t.currency}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* OS Navigation Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-400 rounded-full z-20 opacity-30" />
    </motion.div>
  );
}
