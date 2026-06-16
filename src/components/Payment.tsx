import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Gift, X, ArrowRight, Info, Fingerprint } from 'lucide-react';
import Receipt from './Receipt';
import StatusBar from './StatusBar';
import { parseKHQR } from '../lib/khqr';
import { db } from '../lib/firebase/config';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

interface PaymentProps {
  scannedData: string | null;
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
}

export default function Payment({ scannedData, onBack, currentUserId, currentUserName }: PaymentProps) {
  const [amount, setAmount] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [recipientName, setRecipientName] = useState('LOADING...');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [isDone, setIsDone] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [step, setStep] = useState<'input' | 'pin'>('input');
  const [pin, setPin] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({ USD: 0, KHR: 0 });
  const [accountNumbers, setAccountNumbers] = useState<Record<string, string>>({ USD: '008 661 102', KHR: '000 639 999' });
  const [sourceCurrency, setSourceCurrency] = useState<'USD' | 'KHR'>('USD');
  const [qrValid, setQrValid] = useState(true);
  const [txData, setTxData] = useState<any>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  const EXCHANGE_RATE = 4100;

  useEffect(() => {
    const biometricSaved = localStorage.getItem('biometric_enabled');
    if (biometricSaved === 'true') setIsBiometricEnabled(true);

    fetch(`/api/balance/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data.balances) setBalances(data.balances);
        if (data.accountNumbers) setAccountNumbers(data.accountNumbers);
      });

    if (scannedData) {
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
    }
  }, [scannedData, currentUserId]);

  const sourceAccountNo = accountNumbers[sourceCurrency] || (sourceCurrency === 'USD' ? '008 661 102' : '000 639 999');
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
    if (amount && parseFloat(amount) > 0) {
      const currentVal = parseFloat(amount);
      let converted: number;
      if (newCurrency === 'USD') {
        setCurrency('USD');
        converted = currentVal / EXCHANGE_RATE;
        setAmount(converted.toFixed(2));
      } else {
        setCurrency('KHR');
        converted = currentVal * EXCHANGE_RATE;
        setAmount(Math.round(converted).toString());
      }
    } else {
      setCurrency(newCurrency);
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === 'LOADING...') return '..';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    return parts[0]?.substring(0, 2).toUpperCase() || '..';
  };

  const remarks = ['Thanks', 'Lunch', 'Coffee', 'Rent'];

  const handleKeyPress = (key: string) => {
    if (step === 'input') {
      if (key === 'back') {
        setAmount(prev => prev.slice(0, -1));
      } else if (key === '.') {
        if (currency === 'KHR') return;
        if (!amount.includes('.')) setAmount(prev => (prev === '' ? '0.' : prev + '.'));
      } else {
        if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
        if (amount.length > 9) return;
        setAmount(prev => prev + key);
      }
    } else {
      if (key === 'biometric') {
        setShowBiometricPrompt(true);
        return;
      }
      if (key === 'back') {
        setPin(prev => prev.slice(0, -1));
      } else if (key !== '.') {
        if (pin.length < 4 && !isProcessing) {
          const newPin = pin + key;
          setPin(newPin);
          if (newPin.length === 4) {
            setIsProcessing(true);
            setTimeout(() => {
              setIsProcessing(false);
              handleFinalConfirm(newPin, recipientAccount);
            }, 800);
          }
        }
      }
    }
  };

  const handleNext = () => {
    if (!amount || parseFloat(amount) <= 0 || !canAfford) return;
    if (!recipientAccount.trim()) {
      alert('Invalid recipient. Please scan a valid QR code.');
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
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'BIOMETRIC_AUTH_REQUEST' }));
        await new Promise(r => setTimeout(r, 1000));
      } else if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        await navigator.credentials.get({
          publicKey: { challenge, rpId: window.location.hostname, userVerification: "preferred", timeout: 60000 }
        });
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
      handleFinalConfirm('biometric', recipientAccount);
    } catch (err) {
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
          pin: submittedPin
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Transaction failed');
      setTxData({ id: data.transaction.id, createdAt: new Date(data.transaction.createdAt) });
      setIsDone(true);
    } catch (error) {
      alert('Transaction failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isDone) {
    return <Receipt txData={txData} recipientName={recipientName} amount={amount} currency={currency} remark={remark} isGift={isGift} onDone={onBack} />;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full bg-gradient-to-br from-[#005f73] to-[#0a9396] overflow-hidden">
      <StatusBar />

      {showBiometricPrompt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-[#37a7b8]/10 rounded-full flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-[#37a7b8]" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Biometric Transfer</h3>
              <p className="text-sm text-gray-600 mb-4">Confirm your face or fingerprint to authorize payment</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBiometricPrompt(false)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 text-sm active:bg-gray-200">Cancel</button>
              <button onClick={handleBiometricAuth} className="flex-1 py-3.5 bg-[#37a7b8] rounded-xl font-bold text-white text-sm"><Fingerprint className="w-5 h-5 mx-auto" />Scan</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex items-center justify-between px-4 py-2 safe-top">
        <button onClick={step === 'pin' ? () => setStep('input') : onBack} className="p-2 transition-transform active:scale-90"><X className="w-5 h-5 text-white" /></button>
        <h1 className="text-lg font-bold text-white">ABA Scan</h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-4 pb-2 overflow-hidden">
        {step === 'input' ? (
          <>
            <div className="flex flex-col items-center mb-2">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1.5">
                <span className="text-white font-bold text-sm">{getInitials(recipientName)}</span>
              </div>
              <h2 className="text-white font-bold text-sm text-center max-w-[240px] truncate">{recipientName}</h2>
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-white text-5xl font-bold tracking-tight">{amount || '0'}</span>
              <button onClick={toggleSourceCurrency} className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-bold active:bg-white/30">{currency}</button>
            </div>

            <div className="flex flex-col items-center gap-0.5 mb-2 text-white/80 text-xs">
              <div className="flex items-center gap-1">
                <span className="font-medium">Pay from:</span>
                <span className="font-bold">{sourceAccountNo} | {sourceCurrency}</span>
              </div>
              <div>
                <span>Balance: </span>
                <span className="font-bold">{sourceCurrency === 'USD' ? '$' : ''}{balances[sourceCurrency]?.toLocaleString()}{sourceCurrency === 'KHR' ? ' ៛' : ''}</span>
              </div>
            </div>

            <div className="mb-2">
              <div className="text-white/70 text-xs font-medium mb-1 text-center">Note:</div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar justify-center">
                <button onClick={() => setIsGift(!isGift)} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all font-bold text-xs ${isGift ? 'bg-[#ff5252] border-[#ff5252] text-white' : 'border-white/20 text-white/70'}`}><Gift className="w-3 h-3" />Gift</button>
                {remarks.filter(r => r !== 'Rent').map(r => (
                  <button key={r} onClick={() => setRemark(r)} className={`flex-shrink-0 px-4 py-1.5 rounded-full border transition-all font-bold text-xs ${remark === r ? 'bg-[#37a7b8] border-[#37a7b8] text-white' : 'bg-transparent border-white/20 text-white/60'}`}>{r}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1">
            <h3 className="text-white text-base font-bold mb-3">Enter 4-digit PIN</h3>
            <div className="flex gap-3 mb-4">
              {[...Array(4)].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${i < pin.length ? 'bg-[#37a7b8] border-[#37a7b8] scale-125' : 'bg-transparent border-white/40'}`} />)}
            </div>
            {isProcessing ? <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <button className="text-white/70 text-xs mt-2">Forgot PIN?</button>}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', step === 'pin' && isBiometricEnabled ? 'biometric' : '.', '0', 'back'].map((key, idx) => (
            <button key={idx} onClick={() => handleKeyPress(key)} className="h-11 flex items-center justify-center text-white text-2xl font-medium active:bg-white/5 rounded-full transition-colors disabled:opacity-30" disabled={step === 'pin' && (key === '.' || isProcessing)}>
              {key === 'back' ? <X className="w-5 h-5" /> : key === 'biometric' ? <Fingerprint className="w-5 h-5" /> : key === '.' ? <div className="w-1.5 h-1.5 bg-white rounded-full" /> : key}
            </button>
          ))}
        </div>

        {step === 'input' && (
          <button onClick={handleNext} disabled={!amount || parseFloat(amount) <= 0 || !canAfford} className="w-full bg-[#ff5252] text-white font-bold py-3 rounded-full active:bg-[#e04848] transition-colors disabled:opacity-40 safe-bottom">NEXT</button>
        )}
      </div>

      <div className="h-1 bg-white/10 mx-auto w-32 rounded-full mb-1" />
    </motion.div>
  );
}
