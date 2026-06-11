import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

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
  type
}: ReceiptProps) {
  const details = transactionDetails || {
    amount: amount ? `${amount} ${currency || 'USD'}` : '246.00',
    date: transactionDate ? (typeof transactionDate === 'string' ? transactionDate : new Date(transactionDate).toLocaleDateString('en-US') + ' | ' + new Date(transactionDate).toLocaleTimeString('en-US')) : 'May 11, 2022 | 8:42AM',
    id: transactionId ? transactionId.toString() : '22422068',
    senderName: senderName || 'JOHN DOE',
    senderAccount: senderAccount || 'Payroll Account (001 726 280)',
    receiverName: recipientName || 'RITHY PHUONG',
    receiverAccount: recipientAccount || '009 876 543',
    bankName: 'ABA Bank',
    fee: '0.00'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[#005370] flex flex-col font-sans overflow-hidden"
    >
      <div className="flex-1 flex flex-col items-center justify-start pt-20 px-5">
        {/* Success Icon */}
        <div className="w-[72px] h-[72px] bg-[#7CB342] rounded-full flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-white" strokeWidth={4} />
        </div>
        <h2 className="text-white text-[18px] font-bold mb-8">Success</h2>
        
        {/* White Card */}
        <div className="bg-white rounded-[4px] w-full max-w-[340px] p-5 shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 bg-[#005370] rounded-full flex items-center justify-center text-white text-[16px] font-bold">
              {details.receiverName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[15px] font-bold text-gray-900 leading-tight">-{details.amount} USD</p>
              <p className="text-[13px] text-gray-700 uppercase tracking-wide mt-0.5">{details.receiverName}</p>
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
