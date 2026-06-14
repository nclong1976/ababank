import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
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
  remainingBalance,
  type,
  note
}: ReceiptProps) {
  const formatAmountValue = (amt: any, curr: string) => {
    if (!amt) return '0.00';
    let amtStr = amt.toString().trim();
    const cleanedCurr = (curr || 'USD').toUpperCase();
    amtStr = amtStr
      .replace(cleanedCurr, '')
      .replace('$', '')
      .replace('៛', '')
      .replace('+', '')
      .replace('-', '')
      .trim();
    
    const parsed = parseFloat(amtStr);
    if (isNaN(parsed)) return amt;
    
    const formatted = parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (cleanedCurr === 'USD') {
      return `$${formatted}`;
    } else {
      return `${formatted} ៛`;
    }
  };

  const formatToVNDateTime = (dateInput: any) => {
    if (!dateInput) return 'May 11, 2022 | 8:42AM';
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        return String(dateInput);
      }
      const dateStr = date.toLocaleDateString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).replace(' ', ''); // standard "8:42AM" format
      return `${dateStr} | ${timeStr}`;
    } catch (e) {
      return String(dateInput);
    }
  };

  const details = transactionDetails || {
    amount: amount ? formatAmountValue(amount, currency) : '$246.00',
    date: formatToVNDateTime(transactionDate),
    id: transactionId ? transactionId.toString() : '22422068',
    senderName: senderName || 'JOHN DOE',
    senderAccount: senderAccount || 'Payroll Account (001 726 280)',
    receiverName: recipientName || 'RITHY PHUONG',
    receiverAccount: recipientAccount || '009 876 543',
    bankName: 'ABA Bank',
    fee: '0.00',
    note: note
  };

  const isReceive = type === 'receive';
  const displayPartyName = (isReceive ? details.senderName : details.receiverName) || 'ABA SYSTEM';
  const displayAmount = details.amount;

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[#005370] flex flex-col font-sans overflow-hidden"
    >
      <StatusBar className="bg-[#005370]" />
      <div className="flex-1 flex flex-col items-center justify-start pt-10 px-5">
        {/* Success Icon */}
        <div className="w-[72px] h-[72px] bg-[#7CB342] rounded-full flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-white" strokeWidth={4} />
        </div>
        <h2 className="text-white text-[18px] font-bold mb-8">Success</h2>
        
        {/* White Card */}
        <div className="bg-white rounded-[4px] w-full max-w-[340px] p-5 shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 bg-[#005370] rounded-full flex items-center justify-center text-white text-[16px] font-bold uppercase">
              {displayPartyName.charAt(0)}
            </div>
            <div>
              <p className={`text-[15px] font-bold leading-tight ${isReceive ? 'text-[#007baf]' : 'text-gray-900'}`}>
                {isReceive ? '+' : '-'}{displayAmount}
              </p>
              <p className="text-[13px] text-gray-700 uppercase tracking-wide mt-0.5">{displayPartyName}</p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 my-4" />
          
          {/* Details grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-500 w-[100px] shrink-0">Trx. ID:</span>
              <span className="text-[12px] text-gray-800 text-right font-medium">{details.id}</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-500 w-[100px] shrink-0">Transaction date:</span>
              <span className="text-[12px] text-gray-800 text-right font-medium">{details.date}</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-500 w-[100px] shrink-0">From account:</span>
              <span className="text-[12px] text-gray-800 text-right font-medium">{details.senderAccount}</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-500 w-[100px] shrink-0">To account:</span>
              <span className="text-[12px] text-gray-800 text-right font-medium">{details.receiverAccount}</span>
            </div>
            {details.note && (
              <div className="flex justify-between items-start gap-4">
                <span className="text-[12px] text-gray-500 w-[100px] shrink-0">Remark:</span>
                <span className="text-[12px] text-gray-800 text-right font-medium">{details.note}</span>
              </div>
            )}
            <div className="flex justify-between items-start gap-4">
              <span className="text-[12px] text-gray-500 w-[100px] shrink-0">Fee:</span>
              <span className="text-[12px] text-gray-800 text-right font-medium">{details.fee} {currency || 'USD'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Button */}
      <button 
        onClick={onBack}
        className="w-full bg-[#ff0000] text-white py-[18px] text-[15px] pb-[calc(18px+env(safe-area-inset-bottom,0px))] font-[400] tracking-wider uppercase active:opacity-80 transition-opacity flex justify-center"
      >
        Done
      </button>
    </motion.div>
  );
}
