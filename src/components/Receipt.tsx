import { useEffect, useMemo, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import StatusBar from './StatusBar';

interface ReceiptProps {
  onBack: () => void;
  amount?: string | number;
  currency?: string;
  recipientName?: string;
  recipientAccount?: string;
  senderName?: string;
  senderAccount?: string;
  transactionId?: string;
  transactionDate?: string | Date;
  remainingBalance?: string | number;
  type?: string;
  note?: string;
  txData?: {
    id?: string;
    createdAt?: string | Date;
  };
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
  note,
  txData,
}: ReceiptProps) {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowNotification(true), 1200);
    const hideTimer = setTimeout(() => setShowNotification(false), 4500);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  const getInitials = (name: string): string => {
    if (!name) return 'SS';
    const clean = name.replace(/[^a-zA-Z\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return 'SS';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatCleanAmount = (amt: string | number | undefined) => {
    if (amt === undefined || amt === null || amt === '') return '1.00';

    let amtStr = String(amt).trim();
    amtStr = amtStr.replace(/[A-Za-z]/g, '').replace(/[$៛,+-]/g, '').trim();

    const parsed = parseFloat(amtStr);
    return Number.isNaN(parsed)
      ? '1.00'
      : parsed.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  const formatDateTime = (dateInput: string | Date | undefined) => {
    const buildFormattedDate = (date: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();

      const dayStr = day < 10 ? `0${day}` : String(day);
      const hoursStr = hours < 10 ? `0${hours}` : String(hours);
      const minutesStr = minutes < 10 ? `0${minutes}` : String(minutes);
      const timeOnly = `${hoursStr}:${minutesStr}`;

      return {
        displayDate: `${dayStr} ${month} ${year}, ${timeOnly}`,
        timeOnly,
      };
    };

    const fallback = buildFormattedDate(new Date());
    if (!dateInput) return fallback;

    try {
      const date = new Date(dateInput);

      if (Number.isNaN(date.getTime())) {
        const str = String(dateInput);
        if (str.includes('|')) {
          const parts = str.split('|');
          return {
            displayDate: str,
            timeOnly: parts[1]?.trim() || fallback.timeOnly,
          };
        }
        return fallback;
      }

      return buildFormattedDate(date);
    } catch {
      return fallback;
    }
  };

  const isReceive = type === 'receive';
  const resolvedCurrency = (
    currency ||
    (transactionDetails?.amount?.includes('៛') ? 'KHR' : 'USD')
  ).toUpperCase();

  const rawAmount = transactionDetails ? transactionDetails.amount : amount;
  const formattedAmountVal = formatCleanAmount(rawAmount);

  const resolvedTransactionDate =
    transactionDetails?.date ?? transactionDate ?? txData?.createdAt;

  const { displayDate, timeOnly } = formatDateTime(resolvedTransactionDate);

  const resolvedRecipientName =
    (isReceive
      ? senderName || transactionDetails?.senderName
      : recipientName || transactionDetails?.receiverName) || 'Sovann SEUNG';

  const resolvedRecipientAccount =
    (isReceive
      ? senderAccount || transactionDetails?.senderAccount
      : recipientAccount || transactionDetails?.receiverAccount) || '000 282 862';

  const resolvedSenderAccount =
    (isReceive
      ? recipientAccount || transactionDetails?.receiverAccount
      : senderAccount || transactionDetails?.senderAccount) ||
    'Savings Account with ATM facility (000 282 862)';

  const initials = getInitials(resolvedRecipientName);

  const trxId = useMemo(() => {
    const rawId =
      (transactionDetails ? transactionDetails.id : transactionId) ||
      txData?.id ||
      '9841385178';

    if (/^\d{10}$/.test(rawId)) return rawId;

    let h1 = 0xdeadbeef ^ 0;
    let h2 = 0x41c6ce57 ^ 0;

    for (let i = 0; i < rawId.length; i++) {
      const ch = rawId.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 =
      Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);

    h2 =
      Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    const s1 = Math.abs(h1).toString().padStart(10, '0');
    const s2 = Math.abs(h2).toString().padStart(10, '0');
    return s1.substring(0, 5) + s2.substring(0, 5);
  }, [transactionDetails, transactionId, txData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 24, stiffness: 180 }}
      className="absolute inset-0 z-50 bg-[#003b5c] flex flex-col overflow-hidden"
    >
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 10, opacity: 1 }}
            exit={{ y: -70, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="absolute top-0 left-3 right-3 z-[100]"
          >
            <div className="bg-[#6b1e18]/95 backdrop-blur-xl rounded-[18px] p-3 flex items-start gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)] border border-white/10">
              <div className="w-10 h-10 rounded-[10px] bg-gradient-to-b from-[#005c7a] to-[#003b5c] flex items-center justify-center shrink-0 overflow-hidden">
                <span className="text-white text-[11px] font-black tracking-widest ml-0.5">
                  ABA
                </span>
              </div>

              <div className="flex-1 pt-0.5 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <h4 className="text-white/95 text-[13px] sm:text-[14px] font-semibold tracking-wide uppercase truncate">
                    {resolvedRecipientName}
                  </h4>
                  <span className="text-white/60 text-[11px] sm:text-[12px] font-medium mt-0.5 shrink-0">
                    now
                  </span>
                </div>

                <p className="text-white/90 text-[12.5px] sm:text-[13.5px] leading-[1.3] font-medium">
                  {formattedAmountVal} {resolvedCurrency} Payment from account{' '}
                  {resolvedSenderAccount.match(/(\d{3}\s?\d{3}\s?\d{3})/)
                    ? resolvedSenderAccount.match(/(\d{3}\s?\d{3}\s?\d{3})/)![1]
                    : resolvedSenderAccount
                        .replace(/\D/g, '')
                        .slice(-9)
                        .replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StatusBar className="bg-[#003b5c]" customTime={timeOnly} />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center pt-4 sm:pt-6">
          <div className="w-[68px] h-[68px] sm:w-[72px] sm:h-[72px] bg-[#5cb85c] rounded-full flex items-center justify-center mb-3 shadow-[0_4px_10px_rgba(92,184,92,0.3)]">
            <svg
              className="w-9 h-9 sm:w-10 sm:h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-white text-[20px] sm:text-[22px] font-semibold mb-5 tracking-wide">
            Success
          </h2>

          <div className="bg-white rounded-[18px] w-full px-4 sm:px-6 py-5 shadow-2xl relative flex flex-col">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-14 h-14 bg-[#64b5f6]/30 border border-[#64b5f6]/10 rounded-full flex items-center justify-center">
                  <span className="text-[#007ba8] font-bold text-[18px] tracking-wide">
                    {initials}
                  </span>
                </div>

                <div className="absolute bottom-0 right-0 w-[20px] h-[20px] bg-[#d32f2f] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-[18px] sm:text-[19px] text-[#212121] leading-tight">
                  <strong className="font-bold">-{formattedAmountVal}</strong>{' '}
                  <span className="text-gray-500 font-normal text-[14px] sm:text-[15px]">
                    {resolvedCurrency}
                  </span>
                </span>
                <span className="text-[12px] sm:text-[13px] text-gray-500 font-semibold tracking-wide mt-0.5 truncate">
                  {resolvedRecipientName}
                </span>
              </div>
            </div>

            <div className="relative flex items-center my-5">
              <div className="absolute -left-[24px] sm:-left-[32px] w-4 h-4 rounded-full bg-[#003b5c] z-10"></div>
              <div className="absolute -right-[24px] sm:-right-[32px] w-4 h-4 rounded-full bg-[#003b5c] z-10"></div>
              <div className="w-full border-t border-dashed border-gray-200"></div>
            </div>

            <div className="space-y-3.5">
              <Row label="Trx." value={trxId} />
              <Row label="Transaction date:" value={displayDate} />
              <Row label="From account:" value={resolvedSenderAccount} />
              <Row label=":" value={resolvedRecipientAccount} />
              {note ? <Row label="Note:" value={note} /> : null}
              <Row label="Amount:" value={`${formattedAmountVal} ${resolvedCurrency}`} strong />
            </div>
          </div>

          <div className="flex justify-center items-start gap-8 sm:gap-12 mt-7 mb-5">
            <ActionIcon label="Screenshot">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M9 9h6v6H9V9z" />
              </svg>
            </ActionIcon>

            <ActionIcon label="Download">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </ActionIcon>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
        <button
          onClick={() => onBack()}
          className="w-full max-w-[420px] mx-auto block bg-[#f44336] text-white py-3.5 sm:py-4 rounded-[14px] text-[14px] sm:text-[15px] font-bold tracking-wider uppercase active:opacity-90 transition-opacity shadow-lg"
        >
          HOÀN THÀNH
        </button>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[12px] text-gray-400 font-medium">{label}</span>
      <span
        className={`text-[12px] text-right leading-relaxed ${
          strong ? 'text-gray-800 font-bold' : 'text-gray-800 font-semibold'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ActionIcon({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button className="flex flex-col items-center group cursor-pointer">
      <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-full flex items-center justify-center transition-all group-hover:bg-white/20 active:scale-95">
        {children}
      </div>
      <span className="text-[11px] text-white/80 font-medium tracking-wide mt-2">
        {label}
      </span>
    </button>
  );
}
