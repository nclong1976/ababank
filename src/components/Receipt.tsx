import React from 'react';
import { motion } from 'motion/react';
import StatusBar from './StatusBar';

interface ReceiptProps {
  onBack: () => void;
  amount?: any;
  currency?: any;
  recipientName?: any;
  recipientAccount?: any;
  senderName?: any;
  senderAccount?: any;
  transactionId?: any;
  transactionDate?: any;
  remainingBalance?: any;
  type?: any;
  note?: any;
  transactionDetails?: {
    amount: string;
    date: string;
    id: string;
    senderName: string;
    senderAccount: string;
    receiverName: string;
    receiverAccount: string;
    bankName: string;
    fee: string;
    note?: string;
  };
}

export default function Receipt({ 
  onBack, 
  transactionDetails,
  amount,
  currency,
  recipientName,
  recipientAccount,
  senderName,
  senderAccount,
  transactionId,
  transactionDate,
  type,
  note
}: ReceiptProps) {

  // 1. Data Binding & Extraction Helpers
  const getInitials = (name: string): string => {
    if (!name) return 'SS';
    const clean = name.replace(/[^a-zA-Z\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'SS';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatCleanAmount = (amt: any) => {
    if (!amt) return '1.00';
    let amtStr = amt.toString().trim();
    amtStr = amtStr
      .replace(/[A-Za-z]/g, '')
      .replace(/[$|៛|+|-]/g, '')
      .trim();
    const parsed = parseFloat(amtStr);
    return isNaN(parsed) ? '1.00' : parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDateTime = (dateInput: any) => {
    const fallback = { displayDate: '09 Jun 2024, 08:34', timeOnly: '08:34' };
    if (!dateInput) return fallback;
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        const str = String(dateInput);
        if (str.includes('|')) {
          const parts = str.split('|');
          return { displayDate: str, timeOnly: parts[1].trim() };
        }
        return fallback;
      }
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      const dayStr = day < 10 ? '0' + day : day.toString();
      const hoursStr = hours < 10 ? '0' + hours : hours.toString();
      const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();
      
      const timeOnly = `${hoursStr}:${minutesStr}`;
      return {
        displayDate: `${dayStr} ${month} ${year}, ${timeOnly}`,
        timeOnly
      };
    } catch (e) {
      return fallback;
    }
  };

  // 2. Resolve Data Objects
  const isReceive = type === 'receive';
  const resolvedCurrency = (currency || (transactionDetails?.amount?.includes('៛') ? 'KHR' : 'USD')).toUpperCase();
  const rawAmount = transactionDetails ? transactionDetails.amount : amount;
  
  const formattedAmountVal = formatCleanAmount(rawAmount);
  const { displayDate, timeOnly } = formatDateTime(transactionDetails ? transactionDetails.date : transactionDate);

  const resolvedRecipientName = (isReceive ? (senderName || transactionDetails?.senderName) : (recipientName || transactionDetails?.receiverName)) || 'Sovann SEUNG';
  const resolvedRecipientAccount = (isReceive ? (senderAccount || transactionDetails?.senderAccount) : (recipientAccount || transactionDetails?.receiverAccount)) || '000 282 862';
  const resolvedSenderAccount = (isReceive ? (recipientAccount || transactionDetails?.receiverAccount) : (senderAccount || transactionDetails?.senderAccount)) || 'Savings Account with ATM facility (000 282 862)';

  const initials = getInitials(resolvedRecipientName);
  const trxId = (transactionDetails ? transactionDetails.id : transactionId) || '9841385178';

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[#003b5c] flex flex-col font-sans overflow-hidden select-none"
    >
      {/* Dynamic Status Bar synced with transaction time */}
      <StatusBar className="bg-[#003b5c]" customTime={timeOnly} />
      
      <div className="flex-1 flex flex-col items-center justify-start pt-6 px-6 overflow-y-auto">
        {/* Success Check Badge */}
        <div className="w-[72px] h-[72px] bg-[#5cb85c] rounded-full flex items-center justify-center mb-3 shadow-[0_4px_10px_rgba(92,184,92,0.3)]">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-white text-[20px] font-semibold mb-6 tracking-wide">Success</h2>
        
        {/* Receipt Ticket Card */}
        <div className="bg-white rounded-[12px] w-full max-w-[340px] px-6 py-5 shadow-2xl relative flex flex-col">
          {/* Card Top / Header */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {/* Avatar circle */}
              <div className="w-14 h-14 bg-[#64b5f6]/30 border border-[#64b5f6]/10 rounded-full flex items-center justify-center text-[#0d47a1] text-[18px] font-bold">
                <span className="text-[#007ba8] font-bold text-[18px] tracking-wide">{initials}</span>
              </div>
              {/* Red Transaction Indicator Badge */}
              <div className="absolute bottom-0 right-0 w-[20px] h-[20px] bg-[#d32f2f] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[19px] text-[#212121] leading-tight font-sans">
                <strong className="font-bold">-{formattedAmountVal}</strong>{' '}
                <span className="text-gray-500 font-normal text-[15px]">{resolvedCurrency}</span>
              </span>
              <span className="text-[13px] text-gray-500 font-semibold tracking-wide mt-0.5">{resolvedRecipientName}</span>
            </div>
          </div>
          
          {/* Ticket Edge Cutouts Separator */}
          <div className="relative flex items-center my-6">
            {/* Left cutout */}
            <div className="absolute -left-[32px] w-4 h-4 rounded-full bg-[#003b5c] z-10"></div>
            {/* Right cutout */}
            <div className="absolute -right-[32px] w-4 h-4 rounded-full bg-[#003b5c] z-10"></div>
            {/* Dashed line */}
            <div className="w-full border-t border-dashed border-gray-200"></div>
          </div>
          
          {/* Card Bottom / Details Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-400 font-medium font-sans">Trx. ID:</span>
              <span className="text-[12px] text-gray-800 text-right font-semibold font-sans">{trxId}</span>
            </div>
            
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-400 font-medium font-sans">Transaction date:</span>
              <span className="text-[12px] text-gray-800 text-right font-semibold font-sans">{displayDate}</span>
            </div>
            
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-400 font-medium font-sans">From account:</span>
              <span className="text-[12px] text-gray-800 text-right font-semibold font-sans leading-relaxed">
                {resolvedSenderAccount}
              </span>
            </div>
            
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-400 font-medium font-sans">Amount:</span>
              <span className="text-[12px] text-gray-800 text-right font-bold font-sans">
                {formattedAmountVal} {resolvedCurrency}
              </span>
            </div>
          </div>
        </div>

        {/* Action Options below card */}
        <div className="flex justify-center items-center gap-12 mt-8 mb-6">
          <button className="flex flex-col items-center group cursor-pointer">
            <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-full flex items-center justify-center transition-all group-hover:bg-white/20 active:scale-95">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M9 9h6v6H9V9z" />
              </svg>
            </div>
            <span className="text-[11px] text-white/80 font-medium tracking-wide mt-2">Screenshot</span>
          </button>

          <button className="flex flex-col items-center group cursor-pointer">
            <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-full flex items-center justify-center transition-all group-hover:bg-white/20 active:scale-95">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <span className="text-[11px] text-white/80 font-medium tracking-wide mt-2">Download</span>
          </button>
        </div>
      </div>
      
      {/* Bottom Red DONE Button */}
      <button 
        onClick={onBack}
        className="w-full bg-[#f44336] text-white py-4 text-[15px] pb-[calc(16px+env(safe-area-inset-bottom,0px))] font-bold tracking-wider uppercase active:opacity-90 transition-opacity flex justify-center items-center shadow-lg"
      >
        Done
      </button>
    </motion.div>
  );
}
