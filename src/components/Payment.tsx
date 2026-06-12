import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  Gift, 
  X,
  ArrowRight,
  Info,
  Fingerprint
} from 'lucide-react';
import Receipt from './Receipt';
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
    // Check if biometric is enabled
    const biometricSaved = localStorage.getItem('biometric_enabled');
    if (biometricSaved === 'true') {
      setIsBiometricEnabled(true);
    }
    // Fetch balances
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
        setRecipientName(khqr.name || '');
        if (khqr.amount) setAmount(khqr.amount);
        
        const targetCur = khqr.currency === '116' ? 'KHR' : 'USD';
        setCurrency(targetCur);
        setSourceCurrency(targetCur); // Default to matching currency
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
    
    // Auto-conversion logic
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
        // BLOCKED FOR KHR
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
    console.log('handleNext clicked, recipientAccount:', recipientAccount);
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
          publicKey: {
            challenge: challenge,
            rpId: window.location.hostname,
            userVerification: "preferred",
            timeout: 60000
          }
        });
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      handleFinalConfirm('biometric', recipientAccount);
    } catch (err) {
      console.error('Biometric error:', err);
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
          sourceCurrency: sourceCurrency,
          targetCurrency: currency,
          pin: submittedPin
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Transaction failed');
      }
      
      setTxData({ id: data.transaction.id, createdAt: new Date(data.transaction.createdAt) });
      setIsDone(true);
    } catch (error) {
      console.error('Error creating transaction:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Transaction failed: ' + errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isDone) {
    return (
      <Receipt 
        amount={amount} 
        currency={currency}
        recipientName={recipientName} 
        recipientAccount={recipientAccount}
        senderName={currentUserName}
        senderAccount={sourceAccountNo}
        transactionId={txData?.id}
        transactionDate={txData?.createdAt}
        remainingBalance={availableBalance - currentDeductAmount}
        onBack={onBack} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#014151] flex flex-col font-sans select-none overflow-hidden text-white relative">
      <AnimatePresence>
        {showBiometricPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#003855]/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-black p-8 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[85vw] w-full max-w-sm"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Fingerprint className="w-8 h-8 text-[#00bcd4]" />
              </div>
              <h2 className="text-xl font-bold mb-2 tracking-tight text-[#003855]">Biometric Transfer</h2>
              <p className="text-gray-500 font-medium text-sm text-center max-w-[200px] mb-8">
                Confirm your face or fingerprint to authorize payment
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowBiometricPrompt(false)}
                  className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 text-sm active:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBiometricAuth}
                  className="flex-1 py-3.5 bg-[#00bcd4] rounded-xl font-bold text-white text-sm active:bg-[#009aba] transition-colors"
                >
                  Scan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 rounded-full border-[30px] border-white/5 pointer-events-none" />
      <div className="absolute top-[-50px] right-[-50px] w-60 h-60 rounded-full border-[20px] border-white/5 pointer-events-none" />

      {/* Header */}
      <header className="p-4 flex items-center justify-between z-10 safe-padding-top">
        <button onClick={step === 'pin' ? () => setStep('input') : onBack} className="p-2 transition-transform active:scale-90">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="font-bold text-xl tracking-tight">ABA Scan</h1>
        <button className="p-2 opacity-50">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
             <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-4 overflow-y-auto no-scrollbar z-10">
        {step === 'input' ? (
          <>
            {/* Recipient Identity */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center p-1 mb-4 shadow-xl">
                 <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#217d8a] text-3xl font-black">
                   {getInitials(recipientName)}
                 </div>
              </div>
              <h2 className="font-black text-xl tracking-wider uppercase text-center">{recipientName}</h2>
            </motion.div>

            {/* Central Amount Display */}
            <div className="flex flex-col items-center mb-10 w-full">
              <div className="flex items-center justify-center gap-3">
                <AnimatePresence mode="wait">
                  <motion.span 
                    key={currency + amount}
                    initial={{ opacity: 0.5, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    className="text-white font-black text-[64px] leading-none tracking-tighter"
                  >
                    {amount || '0'}
                  </motion.span>
                </AnimatePresence>
                <div className="px-3 py-1 bg-[#37a7b8] rounded-lg text-white font-black text-sm shadow-lg shadow-[#37a7b8]/20 transition-all">
                  {currency}
                </div>
              </div>
              
              {/* Source Account Selector (Show balance) */}
              <button 
                onClick={toggleSourceCurrency}
                className="mt-8 flex flex-col items-center gap-1 group active:opacity-70 transition-all"
              >
                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-sm font-sans text-white/50">Pay from:</span>
                  <span className="text-sm font-bold tracking-tight">{sourceAccountNo} | {sourceCurrency}</span>
                  <ChevronDown className="w-5 h-5 text-[#37a7b8] group-active:translate-y-0.5 transition-transform" />
                </div>
                <p className="text-[10px] font-bold text-[#8cc63f] opacity-80">
                  Balance: {sourceCurrency === 'USD' ? '$' : ''}{balances[sourceCurrency]?.toLocaleString()}{sourceCurrency === 'KHR' ? ' ៛' : ''}
                </p>
              </button>
            </div>

            <div className="w-full space-y-4">
              <p className="text-xs font-bold text-white/40 font-sans uppercase tracking-widest px-2">Note:</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <button 
                  onClick={() => setIsGift(!isGift)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all font-khmer font-bold text-sm ${
                    isGift ? 'bg-[#ff5252] border-[#ff5252] text-white shadow-lg' : 'border-white/20 text-white/80'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  Gift
                </button>
                {remarks.filter(r => r !== 'Rent').map(r => (
                  <button
                    key={r}
                    onClick={() => setRemark(r)}
                    className={`flex-shrink-0 px-6 py-2.5 rounded-full border-2 transition-all font-bold text-sm ${
                      remark === r 
                        ? 'bg-[#37a7b8] border-[#37a7b8] text-white' 
                        : 'bg-transparent border-white/20 text-white/50 hover:border-white/40'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              
              {/* Optional Remark Text Input */}
              {remark && !remarks.includes(remark) && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="px-2">
                   <p className="text-[#37a7b8] font-bold text-xs">"{remark}"</p>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center w-full pt-8">
            <h2 className="text-lg font-sans mb-12 text-center text-white/70 tracking-wide uppercase font-black">Enter 4-digit PIN</h2>
            
            <div className="flex gap-6 justify-center mb-16">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    pin.length > i 
                      ? 'bg-[#37a7b8] border-[#37a7b8] scale-125 shadow-[0_0_15px_rgba(55,167,184,0.6)]' 
                      : 'bg-transparent border-white/40'
                  }`}
                />
              ))}
            </div>

            {isProcessing ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-10 h-10 border-4 border-[#37a7b8] border-t-transparent rounded-full"
              />
            ) : (
              <button className="text-[#37a7b8] text-sm font-black tracking-widest font-sans uppercase hover:opacity-70 transition-opacity">Forgot PIN?</button>
            )}
          </div>
        )}
      </div>

      {/* Custom Keypad - ABA Style */}
      <div className="p-6 pb-12 z-10">
        <div className="grid grid-cols-3 gap-y-4 gap-x-8 mb-8">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', step === 'pin' && isBiometricEnabled ? 'biometric' : '.', '0', 'back'].map((key, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleKeyPress(key)}
              className={`h-14 flex items-center justify-center text-white text-3xl font-medium active:bg-white/5 rounded-full transition-colors disabled:opacity-30`}
              disabled={step === 'pin' && (key === '.' || isProcessing)}
            >
              {key === 'back' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 opacity-70">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              ) : key === 'biometric' ? (
                 <Fingerprint className="w-8 h-8 opacity-80 text-[#37a7b8]" />
              ) : key === '.' ? (
                <div className="w-2 h-2 bg-white/70 rounded-full" />
              ) : key}
            </motion.button>
          ))}
        </div>

        {step === 'input' && (
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={!amount || parseFloat(amount) <= 0 || !canAfford}
            className={`w-full py-5 rounded-[22px] flex items-center justify-center gap-3 font-black text-xl transition-all font-khmer shadow-2xl uppercase tracking-tighter ${
              !amount || parseFloat(amount) <= 0 || !canAfford
                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                : 'bg-[#ff5252] text-white shadow-[#ff5252]/20'
            }`}
          >
            NEXT
          </motion.button>
        )}
      </div>

      {/* OS Indicator */}
      <div className="pb-1 flex justify-center z-10">
        <div className="w-28 h-1.5 bg-white/5 rounded-full" />
      </div>
    </div>
  );
}

