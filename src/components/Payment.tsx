import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, Fingerprint, Delete } from 'lucide-react';
import Receipt from './Receipt';
import StatusBar from './StatusBar';
import { parseKHQR } from '../lib/khqr';

interface PaymentProps {
  scannedData: string | null;
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
}

export default function Payment({
  scannedData,
  onBack,
  currentUserId,
  currentUserName,
}: PaymentProps) {
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [recipientName, setRecipientName] = useState('LOADING...');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [isDone, setIsDone] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [step, setStep] = useState<'input' | 'pin'>('input');
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({
    USD: 0,
    KHR: 0,
  });
  const [accountNumbers, setAccountNumbers] = useState<Record<string, string>>({
    USD: '008 661 102',
    KHR: '000 639 999',
  });
  const [sourceCurrency, setSourceCurrency] = useState<'USD' | 'KHR'>('USD');
  const [qrValid, setQrValid] = useState(true);
  const [txData, setTxData] = useState<{ id?: string; createdAt?: Date } | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  const EXCHANGE_RATE = 4100;
  const remarks = ['Thanks', 'Lunch', 'Coffee', 'Rent'];

  useEffect(() => {
    try {
      const biometricSaved = localStorage.getItem('biometric_enabled');
      if (biometricSaved === 'true') setIsBiometricEnabled(true);
    } catch {}

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

      const targetCur = khqr.currency === '116' ? 'KHR' : 'USD';
      setCurrency(targetCur);
      setSourceCurrency(targetCur);
    } else {
      setRecipientName('EXTERNAL ACCOUNT');
    }
  }, [scannedData, currentUserId]);

  const sourceAccountNo =
    accountNumbers[sourceCurrency] ||
    (sourceCurrency === 'USD' ? '008 661 102' : '000 639 999');

  const availableBalance = balances[sourceCurrency] || 0;

  const currentDeductAmount = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    if (sourceCurrency === currency) return amt;
    if (sourceCurrency === 'USD' && currency === 'KHR') return amt / EXCHANGE_RATE;
    if (sourceCurrency === 'KHR' && currency === 'USD') return amt * EXCHANGE_RATE;
    return amt;
  }, [amount, sourceCurrency, currency]);

  const canAfford = availableBalance >= currentDeductAmount;

  const toggleSourceCurrency = () => {
    const newCurrency = sourceCurrency === 'USD' ? 'KHR' : 'USD';
    setSourceCurrency(newCurrency);

    if (!amount || parseFloat(amount) <= 0) {
      setCurrency(newCurrency);
      return;
    }

    const currentVal = parseFloat(amount);
    let converted = currentVal;

    if (newCurrency === 'USD') {
      setCurrency('USD');
      converted = currentVal / EXCHANGE_RATE;
      setAmount(converted.toFixed(2));
    } else {
      setCurrency('KHR');
      converted = currentVal * EXCHANGE_RATE;
      setAmount(Math.round(converted).toString());
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === 'LOADING...') return '..';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || '..';
  };

  const handleKeyPress = (key: string) => {
    if (step === 'input') {
      if (key === 'back') {
        setAmount((prev) => prev.slice(0, -1));
        return;
      }

      if (key === '.') {
        if (currency === 'KHR') return;
        if (!amount.includes('.')) {
          setAmount((prev) => (prev === '' ? '0.' : prev + '.'));
        }
        return;
      }

      if (amount.includes('.') && amount.split('.')[1]?.length >= 2) return;
      if (amount.length > 9) return;
      setAmount((prev) => prev + key);
      return;
    }

    if (key === 'biometric') {
      setShowBiometricPrompt(true);
      return;
    }

    if (key === 'back') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === '.' || isProcessing || pin.length >= 4) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 4) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        handleFinalConfirm(newPin, recipientAccount);
      }, 800);
    }
  };

  const handleNext = () => {
    if (!amount || parseFloat(amount) <= 0 || !canAfford) return;

    if (!recipientAccount.trim()) {
      alert('Invalid recipient. Please scan a valid QR code.');
      return;
    }

    if (!qrValid) {
      alert('Invalid KHQR. Please scan a valid QR code.');
      return;
    }

    setStep('pin');

    if (isBiometricEnabled) {
      setTimeout(() => setShowBiometricPrompt(true), 500);
    }
  };

  const handleBiometricAuth = async () => {
    setIsProcessing(true);
    setShowBiometricPrompt(false);

    try {
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'BIOMETRIC_AUTH_REQUEST' })
        );
        await new Promise((r) => setTimeout(r, 1000));
      } else if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'preferred',
            timeout: 60000,
          },
        } as CredentialRequestOptions);
      } else {
        await new Promise((r) => setTimeout(r, 1000));
      }

      handleFinalConfirm('biometric', recipientAccount);
    } catch {
      alert('Biometric verification failed');
      setIsProcessing(false);
      setPin('');
    }
  };

  const handleFinalConfirm = async (submittedPin: string, recipient: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverAccountNo: recipient,
          receiverName: recipientName,
          amount: parseFloat(amount),
          sourceCurrency,
          targetCurrency: currency,
          pin: submittedPin,
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
    } finally {
      setIsProcessing(false);
    }
  };

  if (isDone) {
    return (
      <Receipt
        txData={txData}
        recipientName={recipientName}
        recipientAccount={recipientAccount}
        amount={amount}
        currency={currency}
        transactionId={txData?.id}
        transactionDate={txData?.createdAt}
        note={remark}
        onBack={onBack}
      />
    );
  }

  const keypadItems = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    step === 'pin' && isBiometricEnabled ? 'biometric' : '.',
    '0',
    'back',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex flex-col h-full min-h-0 bg-gradient-to-br from-[#005f73] via-[#0b7588] to-[#0a9396] overflow-hidden"
    >
      <StatusBar />

      <AnimatePresence>
        {showBiometricPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-[#37a7b8]/10 rounded-full flex items-center justify-center">
                  <Fingerprint className="w-8 h-8 text-[#37a7b8]" />
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  Biometric Transfer
                </h3>

                <p className="text-sm text-gray-600 mb-5">
                  Confirm your face or fingerprint to authorize payment
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBiometricPrompt(false)}
                  className="flex-1 py-3.5 bg-gray-100 rounded-2xl font-bold text-gray-600 text-sm active:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  onClick={handleBiometricAuth}
                  className="flex-1 py-3.5 bg-[#37a7b8] rounded-2xl font-bold text-white text-sm active:opacity-90"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Fingerprint className="w-5 h-5" />
                    Scan
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between px-4 sm:px-5 py-2">
        <button
          onClick={step === 'pin' ? () => setStep('input') : () => onBack()}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 active:bg-white/10 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-white">ABA Scan</h1>
        <div className="w-10" />
      </div>

      <div className="relative z-10 flex-1 min-h-0 flex flex-col px-4 sm:px-5 pb-4">
        <div className="w-full max-w-[460px] mx-auto flex-1 min-h-0 flex flex-col">
          {step === 'input' ? (
            <div className="flex flex-col min-h-0">
              <div className="flex flex-col items-center mt-1 mb-3">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-base">
                    {getInitials(recipientName)}
                  </span>
                </div>

                <h2 className="text-white font-bold text-sm sm:text-base text-center max-w-[280px] truncate">
                  {recipientName}
                </h2>

                {recipientAccount ? (
                  <p className="text-white/65 text-[11px] sm:text-xs mt-1">
                    {recipientAccount}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-center gap-2 mb-3 min-h-[72px]">
                <span className="text-white text-[42px] sm:text-[52px] font-bold tracking-tight leading-none break-all text-center">
                  {amount || '0'}
                </span>

                <button
                  onClick={toggleSourceCurrency}
                  className="shrink-0 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-bold active:bg-white/30"
                >
                  {currency}
                </button>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-2xl p-3 sm:p-4 mb-3">
                <div className="flex items-center justify-between gap-3 text-white/80 text-xs sm:text-sm">
                  <span className="font-medium">Pay from</span>
                  <span className="font-bold text-right">
                    {sourceAccountNo} | {sourceCurrency}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-2 text-white/80 text-xs sm:text-sm">
                  <span className="font-medium">Balance</span>
                  <span className="font-bold text-right">
                    {sourceCurrency === 'USD' ? '$' : ''}
                    {balances[sourceCurrency]?.toLocaleString()}
                    {sourceCurrency === 'KHR' ? ' ៛' : ''}
                  </span>
                </div>

                {!canAfford && amount ? (
                  <p className="text-[#ffd8d8] text-[11px] sm:text-xs mt-2 font-medium">
                    Insufficient balance for this payment.
                  </p>
                ) : null}
              </div>

              <div className="mb-3">
                <div className="text-white/70 text-xs font-medium mb-2 text-center">
                  Note
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setIsGift(!isGift)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all font-bold text-xs ${
                      isGift
                        ? 'bg-[#ff5252] border-[#ff5252] text-white'
                        : 'border-white/20 text-white/70'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Gift
                  </button>

                  {remarks
                    .filter((r) => r !== 'Rent')
                    .map((r) => (
                      <button
                        key={r}
                        onClick={() => setRemark(r)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full border transition-all font-bold text-xs ${
                          remark === r
                            ? 'bg-[#37a7b8] border-[#37a7b8] text-white'
                            : 'bg-transparent border-white/20 text-white/60'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
              <h3 className="text-white text-base sm:text-lg font-bold mb-3">
                Enter 4-digit PIN
              </h3>

              <div className="flex gap-3 mb-5">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      i < pin.length
                        ? 'bg-[#37a7b8] border-[#37a7b8] scale-110'
                        : 'bg-transparent border-white/40'
                    }`}
                  />
                ))}
              </div>

              {isProcessing ? (
                <div className="w-9 h-9 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <button className="text-white/70 text-xs mt-1 active:opacity-80">
                  Forgot PIN?
                </button>
              )}
            </div>
          )}

          <div className="mt-auto">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
              {keypadItems.map((key, idx) => (
                <button
                  key={idx}
                  onClick={() => handleKeyPress(key)}
                  className="h-12 sm:h-14 flex items-center justify-center text-white text-[26px] sm:text-[28px] font-medium active:bg-white/10 rounded-2xl transition-colors disabled:opacity-30"
                  disabled={step === 'pin' && (key === '.' || isProcessing)}
                >
                  {key === 'back' ? (
                    <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : key === 'biometric' ? (
                    <Fingerprint className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : key === '.' ? (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>

            {step === 'input' && (
              <button
                onClick={handleNext}
                disabled={!amount || parseFloat(amount) <= 0 || !canAfford}
                className="w-full bg-[#ff5252] text-white font-bold py-3.5 sm:py-4 rounded-2xl active:bg-[#e04848] transition-colors disabled:opacity-40 text-sm sm:text-base"
              >
                NEXT
              </button>
            )}

            <div className="h-1 bg-white/10 mx-auto w-28 rounded-full mt-3" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
