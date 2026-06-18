import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, ChevronDown } from 'lucide-react';
import Receipt from './Receipt';
import StatusBar from './StatusBar';
import { parseKHQR } from '../lib/khqr';

interface PaymentProps {
  scannedData: string | null;
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
}

type Currency = 'USD' | 'KHR';

const REMARKS = ['Thanks', 'Lunch', 'Coffee', 'Dinner', 'Breakfast'];

// ── Watermark SVG ───────────────────────────────────────────────────
const WatermarkSVG = () => (
  <svg
    className="absolute pointer-events-none select-none"
    style={{
      top: '10%',
      right: '-25%',
      width: '150vw',
      height: '150vw',
      maxWidth: 600,
      maxHeight: 600,
      opacity: 0.55,
      zIndex: 0,
    }}
    viewBox="0 0 400 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M200 50C282.843 50 350 117.157 350 200C350 282.843 282.843 350 200 350C117.157 350 50 282.843 50 200C50 117.157 117.157 50 200 50Z"
      stroke="rgba(255,255,255,0.04)"
      strokeWidth="40"
    />
    <path
      d="M200 80C266.274 80 320 133.726 320 200C320 266.274 266.274 320 200 320C133.726 320 80 266.274 80 200C80 133.726 133.726 80 200 80Z"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth="20"
    />
    <path
      d="M230 140V260M230 140H190C178.954 140 170 160V180C170 191.046 178.954 200 190 200H210C221.046 200 230 208.954 230 220V260"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth="24"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const getInitials = (name: string) => {
  if (!name || name === 'LOADING...') return '..';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || '..';
};

const formatAmount = (val: string) => {
  if (!val) return '0';
  const [int, dec] = val.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
};

export default function Payment({
  scannedData,
  onBack,
  currentUserId,
}: PaymentProps) {
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('LOADING...');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [currency, setCurrency] = useState<Currency>('KHR');
  const [sourceCurrency, setSourceCurrency] = useState<Currency>('KHR');
  const [isDone, setIsDone] = useState(false);
  const [qrValid, setQrValid] = useState(true);
  const [txData, setTxData] = useState<{ id?: string; createdAt?: Date } | null>(null);
  const [accountNumbers, setAccountNumbers] = useState<{ USD: string; KHR: string }>({
    USD: '008 661 102',
    KHR: '000 639 999',
  });
  const [amountScale, setAmountScale] = useState(1);

  useEffect(() => {
    fetch(`/api/balance/${currentUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.accountNumbers) setAccountNumbers(data.accountNumbers);
      })
      .catch(() => {});

    if (!scannedData) return;

    if (scannedData.startsWith('000201')) {
      const khqr = parseKHQR(scannedData);
      setQrValid(khqr.isValid);
      setRecipientAccount(khqr.accountNo?.trim() || '');
      setRecipientName(khqr.name || 'Unknown Recipient');
      if (khqr.amount) setAmount(khqr.amount);
      const targetCur: Currency = khqr.currency === '116' ? 'KHR' : 'USD';
      setCurrency(targetCur);
      setSourceCurrency(targetCur);
    } else {
      setRecipientName('EXTERNAL ACCOUNT');
    }
  }, [scannedData, currentUserId]);

  const sourceAccountNo =
    accountNumbers[sourceCurrency] ||
    (sourceCurrency === 'USD' ? '008 661 102' : '000 639 999');

  const handleKeyPress = (key: string) => {
    setAmountScale(0.93);
    setTimeout(() => setAmountScale(1), 90);
    if (navigator.vibrate) navigator.vibrate(18);

    if (key === 'back') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (amount.length >= 10) return;
    if (key === '.' && amount.includes('.')) return;
    if (key === '.' && amount === '') { setAmount('0.'); return; }
    setAmount((prev) => prev + key);
  };

  const handleContinue = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!recipientAccount.trim()) {
      alert('Invalid recipient. Please scan a valid QR code.');
      return;
    }
    if (!qrValid) {
      alert('Invalid KHQR. Please scan a valid QR code.');
      return;
    }
    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverAccountNo: recipientAccount,
          receiverName: recipientName,
          amount: parseFloat(amount),
          sourceCurrency,
          targetCurrency: currency,
          pin: '0000',
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Transaction failed');
      setTxData({ id: data.transaction.id, createdAt: new Date(data.transaction.createdAt) });
      setIsDone(true);
    } catch (error) {
      alert('Transaction failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (isDone) {
    return (
      <Receipt
        onBack={onBack}
        amount={amount}
        currency={currency}
        recipientName={recipientName}
        recipientAccount={recipientAccount}
        senderAccount={sourceAccountNo}
        note={remark}
        txData={txData}
      />
    );
  }

  const keypadItems = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  const canSubmit = !!amount && parseFloat(amount) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#133D50', fontFamily: "'Manrope', sans-serif" }}
    >
      {/* Watermark */}
      <WatermarkSVG />

      {/* Status Bar */}
      <StatusBar className="bg-transparent relative z-10" />

      {/* Header */}
      <header className="relative z-10 flex items-center px-4 pb-3 pt-1">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 12 20" stroke="currentColor" strokeWidth={2.5}>
            <path d="M10.5 18.5L2 10L10.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="ml-3 text-xl font-bold tracking-wide text-white">ABA Transfer</h1>
      </header>

      {/* Scrollable body */}
      <div
        className="relative z-10 flex-1 overflow-y-auto pb-[88px]"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Avatar + Name */}
        <div className="flex flex-col items-center mt-4 mb-6">
          <div
            className="mb-4 flex items-center justify-center rounded-full"
            style={{ width: 90, height: 90, border: '1.5px solid rgba(255,255,255,0.25)', padding: 3 }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #40DFDF 0%, #128CAE 100%)' }}
            >
              <span className="text-white text-3xl font-bold tracking-wider">
                {getInitials(recipientName)}
              </span>
            </div>
          </div>
          <h2 className="text-[17px] font-bold tracking-wide text-white">{recipientName}</h2>
          {recipientAccount && (
            <p className="mt-0.5 text-sm" style={{ color: '#8CB1C2' }}>{recipientAccount}</p>
          )}
        </div>

        {/* Amount Display */}
        <div className="flex items-center justify-center mb-6 px-4">
          <motion.span
            animate={{ scale: amountScale }}
            transition={{ duration: 0.09, ease: 'easeOut' }}
            className="font-semibold mr-3 text-white"
            style={{ fontSize: amount.length > 7 ? 36 : 52, letterSpacing: '-1px', lineHeight: 1 }}
          >
            {formatAmount(amount)}
          </motion.span>
          <button
            onClick={() => {
              const next: Currency = currency === 'KHR' ? 'USD' : 'KHR';
              setCurrency(next);
              setSourceCurrency(next);
            }}
            className="flex items-center gap-1 rounded-md px-3 py-[5px] text-[15px] font-semibold text-white active:opacity-70 transition-opacity"
            style={{ backgroundColor: '#3FA9C3' }}
          >
            {currency === 'KHR' ? 'Riel' : 'Dollar'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pay From */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setSourceCurrency((prev) => (prev === 'USD' ? 'KHR' : 'USD'))}
            className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
          >
            <span style={{ color: '#8CB1C2', fontSize: 13 }}>Pay from:</span>
            <span style={{ color: '#3FA9C3', fontSize: 14, fontWeight: 600 }}>
              {sourceAccountNo} | {sourceCurrency}
            </span>
            <ChevronDown className="h-3.5 w-3.5" style={{ color: '#3FA9C3' }} />
          </button>
        </div>

        {/* Note Label */}
        <div className="px-5 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8CB1C2' }}>
            Note:
          </span>
        </div>

        {/* Note Chips — horizontal scroll */}
        <div
          className="flex gap-3 px-5 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any }}
        >
          <button
            onClick={() => setIsGift(!isGift)}
            className="flex shrink-0 items-center gap-2 rounded-full border px-4 py-[9px] text-sm font-medium transition-all active:scale-95"
            style={{
              borderColor: 'rgba(243,92,92,0.55)',
              backgroundColor: isGift ? 'rgba(243,92,92,0.18)' : 'rgba(26,79,101,0.5)',
              color: '#F35C5C',
            }}
          >
            <Gift className="h-4 w-4" />
            Gift
          </button>

          {REMARKS.map((r) => (
            <button
              key={r}
              onClick={() => setRemark(remark === r ? '' : r)}
              className="shrink-0 rounded-full border px-5 py-[9px] text-sm font-medium transition-all active:scale-95"
              style={{
                borderColor: remark === r ? '#3FA9C3' : 'rgba(255,255,255,0.12)',
                backgroundColor: remark === r ? 'rgba(63,169,195,0.2)' : 'rgba(26,79,101,0.3)',
                color: remark === r ? '#3FA9C3' : '#8CB1C2',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 px-2 mt-2">
          {keypadItems.map((key, idx) => (
            <button
              key={idx}
              onClick={() => key && handleKeyPress(key)}
              disabled={!key}
              className="flex h-16 items-center justify-center rounded-xl transition-colors active:bg-white/10 disabled:pointer-events-none disabled:opacity-0"
            >
              {key === 'back' ? (
                <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8.5 0C7.5 0 6.6 0.5 6 1.3L0 9L6 16.7C6.6 17.5 7.5 18 8.5 18H22C23.1 18 24 17.1 24 16V2C24 0.9 23.1 0 22 0H8.5ZM12.7 4.7L16 8L19.3 4.7L20.7 6.1L17.4 9.4L20.7 12.7L19.3 14.1L16 10.8L12.7 14.1L11.3 12.7L14.6 9.4L11.3 6.1L12.7 4.7Z"
                    fill="white"
                  />
                </svg>
              ) : (
                <span className="text-[28px] font-normal text-white">{key}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Fixed CONTINUE button */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <motion.button
          onClick={handleContinue}
          disabled={!canSubmit}
          animate={{ opacity: canSubmit ? 1 : 0.5 }}
          whileTap={{ scale: 0.98 }}
          className="w-full uppercase tracking-widest text-white font-semibold text-[19px] flex items-center justify-center transition-colors"
          style={{
            height: 88,
            paddingBottom: 20,
            backgroundColor: '#F35C5C',
            boxShadow: canSubmit ? '0 -4px 20px rgba(243,92,92,0.35)' : 'none',
          }}
        >
          Continue
        </motion.button>
      </div>
    </motion.div>
  );
}
