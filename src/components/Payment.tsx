import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, Fingerprint, Delete, ShieldCheck } from 'lucide-react';
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
type Step = 'input' | 'pin';

const EXCHANGE_RATE = 4100;
const REMARKS = ['Thanks', 'Lunch', 'Coffee', 'Rent'];

const safeArea = {
  paddingTop: 'max(env(safe-area-inset-top), 0px)',
  paddingRight: 'max(env(safe-area-inset-right), 0px)',
  paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
  paddingLeft: 'max(env(safe-area-inset-left), 0px)',
};

const keypadButtonBase =
  'flex min-h-[52px] w-full items-center justify-center rounded-[18px] text-white transition active:scale-[0.985] active:bg-white/10 disabled:opacity-35 disabled:active:scale-100';
const glassCard =
  'rounded-[24px] border border-white/12 bg-white/10 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.12)]';
const chipBase =
  'inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-full border px-4 text-xs font-bold transition active:scale-[0.98]';

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
  const [step, setStep] = useState<Step>('input');
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balances, setBalances] = useState<Record<Currency, number>>({
    USD: 0,
    KHR: 0,
  });
  const [accountNumbers, setAccountNumbers] = useState<Record<Currency, string>>({
    USD: '008 661 102',
    KHR: '000 639 999',
  });
  const [sourceCurrency, setSourceCurrency] = useState<Currency>('USD');
  const [qrValid, setQrValid] = useState(true);
  const [txData, setTxData] = useState<{ id?: string; createdAt?: Date } | null>(
    null
  );
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

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
    const newCurrency: Currency = sourceCurrency === 'USD' ? 'KHR' : 'USD';
    setSourceCurrency(newCurrency);

    if (!amount || parseFloat(amount) <= 0) {
      setCurrency(newCurrency);
      return;
    }

    const currentVal = parseFloat(amount);

    if (newCurrency === 'USD') {
      setCurrency('USD');
      setAmount((currentVal / EXCHANGE_RATE).toFixed(2));
      return;
    }

    setCurrency('KHR');
    setAmount(Math.round(currentVal * EXCHANGE_RATE).toString());
  };

  const getInitials = (name: string) => {
    if (!name || name === 'LOADING...') return '..';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || '..';
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
      if (amount.length >= 10) return;
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
      }, 700);
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
      setTimeout(() => setShowBiometricPrompt(true), 350);
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
      className="relative isolate w-full overflow-hidden text-white"
      style={{
        minHeight: '100dvh',
        height: '100dvh',
        maxHeight: '100dvh',
        ...safeArea,
        background:
          'linear-gradient(160deg, #005f73 0%, #0b7588 48%, #0a9396 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 30%), radial-gradient(circle at bottom left, rgba(255,255,255,0.08), transparent 24%)',
        }}
      />

      <StatusBar />

      <AnimatePresence>
        {showBiometricPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 28, opacity: 0, scale: 0.985 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.985 }}
              className="w-full max-w-sm rounded-[28px] bg-white p-5 text-center text-slate-800 shadow-2xl"
            >
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#37a7b8]/10">
                <Fingerprint className="h-8 w-8 text-[#37a7b8]" />
              </div>

              <h3 className="text-lg font-bold">Biometric Transfer</h3>
              <p className="mt-1 text-sm text-slate-500">
                Confirm your face or fingerprint to authorize payment
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowBiometricPrompt(false)}
                  className="min-h-[48px] flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 active:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBiometricAuth}
                  className="min-h-[48px] flex-1 rounded-2xl bg-[#37a7b8] text-sm font-bold text-white active:opacity-90"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Scan
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="relative z-10 mx-auto flex w-full max-w-[480px] flex-col"
        style={{
          minHeight: '100%',
          height: '100%',
          maxHeight: '100%',
        }}
      >
        <header className="flex items-center justify-between px-4 pb-2 pt-2">
          <button
            onClick={step === 'pin' ? () => setStep('input') : onBack}
            className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
            aria-label={step === 'pin' ? 'Back to payment' : 'Close payment'}
          >
            <X className="h-5 w-5 text-white" />
          </button>

          <h1 className="text-[17px] font-bold tracking-[0.01em]">ABA Scan</h1>
          <div className="w-11" />
        </header>

        <main className="flex min-h-0 flex-1 flex-col px-4">
          {step === 'input' ? (
            <>
              <section className="flex flex-col items-center pb-3 pt-1">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <span className="text-base font-bold">
                    {getInitials(recipientName)}
                  </span>
                </div>

                <h2 className="max-w-[280px] text-center text-[15px] font-bold leading-tight">
                  {recipientName}
                </h2>

                {recipientAccount ? (
                  <p className="mt-1 text-center text-[12px] text-white/70">
                    {recipientAccount}
                  </p>
                ) : null}
              </section>

              <section className="flex flex-col items-center justify-center pb-3">
                <div className="flex w-full items-start justify-center gap-2">
                  <div
                    className="max-w-full overflow-hidden text-center text-[clamp(2.75rem,8vw,3.7rem)] font-bold leading-none tracking-[-0.03em]"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {amount || '0'}
                  </div>

                  <button
                    onClick={toggleSourceCurrency}
                    className="mt-2 shrink-0 rounded-full bg-white/18 px-3 py-1.5 text-[13px] font-bold backdrop-blur-sm active:bg-white/28"
                  >
                    {currency}
                  </button>
                </div>
              </section>

              <section className={`${glassCard} px-4 py-3`}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-white/78">Pay from</span>
                  <span className="text-right text-[13px] font-bold leading-snug">
                    {sourceAccountNo} | {sourceCurrency}
                  </span>
                </div>

                <div className="mt-2 flex items-start justify-between gap-3 text-sm">
                  <span className="text-white/78">Balance</span>
                  <span className="text-right text-[13px] font-bold leading-snug">
                    {sourceCurrency === 'USD' ? '$' : ''}
                    {balances[sourceCurrency]?.toLocaleString()}
                    {sourceCurrency === 'KHR' ? ' ៛' : ''}
                  </span>
                </div>

                {!canAfford && amount ? (
                  <p className="mt-2 text-[12px] font-medium text-[#ffd8d8]">
                    Insufficient balance for this payment.
                  </p>
                ) : null}
              </section>

              <section className="min-h-0 pt-3">
                <div className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-white/68">
                  Quick notes
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setIsGift(!isGift)}
                    className={`${chipBase} ${
                      isGift
                        ? 'border-[#ff5252] bg-[#ff5252] text-white'
                        : 'border-white/20 bg-white/5 text-white/78'
                    }`}
                  >
                    <Gift className="mr-1.5 h-3.5 w-3.5" />
                    Gift
                  </button>

                  {REMARKS.filter((r) => r !== 'Rent').map((r) => (
                    <button
                      key={r}
                      onClick={() => setRemark(r)}
                      className={`${chipBase} ${
                        remark === r
                          ? 'border-[#37a7b8] bg-[#37a7b8] text-white'
                          : 'border-white/20 bg-white/5 text-white/68'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/14 backdrop-blur-sm">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <h2 className="text-[18px] font-bold leading-tight">
                Please enter your 4-digit PIN
              </h2>
              <p className="mt-1 max-w-[280px] text-sm text-white/70">
                Confirm the transfer to continue.
              </p>

              <div className="mt-5 flex gap-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                      i < pin.length
                        ? 'scale-110 border-[#37a7b8] bg-[#37a7b8]'
                        : 'border-white/45 bg-transparent'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-5 min-h-[36px]">
                {isProcessing ? (
                  <div className="h-9 w-9 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
                ) : (
                  <button className="text-xs text-white/72 active:opacity-80">
                    Forgot PIN?
                  </button>
                )}
              </div>
            </section>
          )}

          <section
            className="mt-auto pt-3"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
            }}
          >
            <div className="grid grid-cols-3 gap-2.5">
              {keypadItems.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={keypadButtonBase}
                  disabled={step === 'pin' && (key === '.' || isProcessing)}
                  aria-label={
                    key === 'back'
                      ? 'Delete'
                      : key === 'biometric'
                      ? 'Fingerprint'
                      : key === '.'
                      ? 'Dot'
                      : `Number ${key}`
                  }
                >
                  {key === 'back' ? (
                    <Delete className="h-5 w-5" />
                  ) : key === 'biometric' ? (
                    <Fingerprint className="h-5 w-5" />
                  ) : key === '.' ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : (
                    <span className="text-[29px] font-medium leading-none">{key}</span>
                  )}
                </button>
              ))}
            </div>

            {step === 'input' ? (
              <button
                onClick={handleNext}
                disabled={!amount || parseFloat(amount) <= 0 || !canAfford}
                className="mt-3 min-h-[52px] w-full rounded-[18px] bg-[#ff5252] px-4 text-sm font-bold tracking-[0.03em] text-white transition active:scale-[0.99] active:bg-[#e04848] disabled:opacity-45"
              >
                CONTINUE
              </button>
            ) : null}

            <div className="mx-auto mt-3 h-1 w-28 rounded-full bg-white/12" />
          </section>
        </main>
      </div>
    </motion.div>
  );
}
