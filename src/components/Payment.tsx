import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, Fingerprint, Delete, ChevronDown } from 'lucide-react';
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

const EXCHANGE_RATE = 4100;
const REMARKS = ['Thanks', 'Lunch', 'Coffee'];

export default function Payment({
  scannedData,
  onBack,
  currentUserId,
}: PaymentProps) {
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [recipientName, setRecipientName] = useState('LOADING...');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [isDone, setIsDone] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [balances, setBalances] = useState<{ USD: number; KHR: number }>({
    USD: 0,
    KHR: 0,
  });
  const [accountNumbers, setAccountNumbers] = useState<{ USD: string; KHR: string }>({
    USD: '008 661 102',
    KHR: '000 639 999',
  });
  const [sourceCurrency, setSourceCurrency] = useState<Currency>('USD');
  const [qrValid, setQrValid] = useState(true);
  const [txData, setTxData] = useState<{ id?: string; createdAt?: Date } | null>(null);

  useEffect(() => {
    fetch(`/api/balance/${currentUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.balances) setBalances(data.balances);
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

  const getInitials = (name: string) => {
    if (!name || name === 'LOADING...') return '..';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || '..';
  };

  const handleKeyPress = (key: string) => {
    if (key === 'back') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }

    if (amount.length >= 10) return;
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
      if (!data.success) {
        throw new Error(data.error || 'Transaction failed');
      }

      setTxData({
        id: data.transaction.id,
        createdAt: new Date(data.transaction.createdAt),
      });
      setIsDone(true);
    } catch (error) {
      alert(
        'Transaction failed: ' +
          (error instanceof Error ? error.message : String(error))
      );
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#194d63]"
    >
      <StatusBar className="bg-[#194d63]" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
          aria-label="Back"
        >
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold tracking-wide text-white">ABA Transfer</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="mx-auto w-full max-w-lg space-y-6 pt-8">
          {/* Recipient Info */}
          <div className="flex flex-col items-center">
            <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg">
              <span className="text-3xl font-bold text-white">{getInitials(recipientName)}</span>
            </div>
            <h2 className="text-center text-xl font-bold text-white">{recipientName}</h2>
            {recipientAccount && (
              <p className="mt-1 text-sm text-white/60">{recipientAccount}</p>
            )}
          </div>

          {/* Amount Display */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-6xl font-light text-white">{amount || '0'}</span>
            <div className="rounded-2xl bg-cyan-500 px-5 py-2">
              <span className="text-lg font-bold text-white">
                {currency === 'KHR' ? 'Riel' : 'Dollar'}
              </span>
            </div>
          </div>

          {/* Pay From */}
          <div className="flex items-center justify-center gap-2 text-white/80">
            <span className="text-sm">Pay from:</span>
            <button
              onClick={() => setSourceCurrency(sourceCurrency === 'USD' ? 'KHR' : 'USD')}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold active:bg-white/20"
            >
              <span>{sourceAccountNo} | {sourceCurrency}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white/90">NOTE:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsGift(!isGift)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  isGift
                    ? 'border-red-400 bg-red-400 text-white'
                    : 'border-white/30 bg-transparent text-white/70'
                }`}
              >
                <Gift className="h-4 w-4" />
                Gift
              </button>
              {REMARKS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRemark(r)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    remark === r
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                      : 'border-white/30 bg-transparent text-white/70'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keypad + Continue Button */}
      <div className="border-t border-white/10 bg-[#194d63] px-5 pb-6 pt-4">
        <div className="mx-auto w-full max-w-lg space-y-3">
          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {keypadItems.map((key, idx) => (
              <button
                key={idx}
                onClick={() => key && handleKeyPress(key)}
                disabled={!key}
                className="flex h-14 items-center justify-center rounded-2xl bg-white/5 text-2xl font-light text-white transition active:scale-95 active:bg-white/10 disabled:opacity-0"
              >
                {key === 'back' ? (
                  <X className="h-6 w-6" />
                ) : (
                  key
                )}
              </button>
            ))}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 py-4 text-base font-bold uppercase tracking-wider text-white shadow-lg transition active:scale-98 disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
}
