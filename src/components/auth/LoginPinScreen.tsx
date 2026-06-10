import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint } from 'lucide-react';

interface LoginPinScreenProps {
  onSuccess: (user: any) => void;
  userName: string;
}

export default function LoginPinScreen({ onSuccess, userName }: LoginPinScreenProps) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    // Check if biometric is enabled for this user device
    const biometricSaved = localStorage.getItem('biometric_enabled');
    if (biometricSaved === 'true') {
      setIsBiometricEnabled(true);
      // Auto prompt on load if it's enabled
      setTimeout(() => setShowBiometricPrompt(true), 500);
    }
  }, []);

  const handleBiometricAuth = async () => {
    setIsProcessing(true);
    setShowBiometricPrompt(false);
    
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "ABA Bank", id: window.location.hostname },
            user: {
              id: new Uint8Array(16),
              name: userName,
              displayName: userName
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "preferred"
            },
            timeout: 60000
          }
        });
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }

      const res = await fetch('/api/auth/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName })
      });
      const data = await res.json();
      if (data.ok) {
        onSuccess(data.user);
      } else {
        throw new Error("Biometric auth failed");
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setPin('');
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (isProcessing) return;
    
    if (key === 'biometric') {
      setShowBiometricPrompt(true);
      return;
    }

    if (key === 'back') {
      setPin(prev => prev.slice(0, -1));
      setIsError(false);
    } else if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      
      if (newPin.length === 4) {
        const trySubmit = async (p: string) => {
          setIsProcessing(true);
          try {
            const res = await fetch('/api/auth/pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: p })
            });
            const data = await res.json();
            if (data.ok) {
              onSuccess(data.user);
            } else {
              setIsError(true);
              setPin('');
              setIsProcessing(false);
            }
          } catch (err) {
            console.error(err);
            setIsError(true);
            setPin('');
            setIsProcessing(false);
          }
        };

        trySubmit(newPin);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#005c7a] flex flex-col items-center p-8 font-sans text-white relative">
      <AnimatePresence>
        {showBiometricPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#005c7a]/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white text-black p-8 rounded-3xl flex flex-col items-center shadow-2xl max-w-[80vw]"
            >
              <div className="w-16 h-16 bg-[#00bcd4]/10 rounded-full flex items-center justify-center mb-6">
                <Fingerprint className="w-10 h-10 text-[#00bcd4]" />
              </div>
              <h2 className="text-xl font-bold mb-2">Biometric Login</h2>
              <p className="text-gray-500 font-medium text-sm text-center max-w-[200px] mb-8">
                Confirm your face or fingerprint to continue
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setShowBiometricPrompt(false)}
                  className="flex-1 py-3 bg-gray-100 rounded-full font-bold text-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBiometricAuth}
                  className="flex-1 py-3 bg-[#00bcd4] rounded-full font-bold text-white text-sm"
                >
                  Scan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden mb-6 shadow-2xl">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 font-sans">Hello, {userName}</h1>
        <p className="text-white/60 mb-12 uppercase tracking-widest text-xs font-bold font-sans">ENTER PIN (4 digits)</p>

        <div className="flex gap-6 mb-12">
          {[...Array(4)].map((_, i) => (
            <motion.div 
              key={i}
              animate={isError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                pin.length > i 
                  ? 'bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.8)]' 
                  : 'bg-transparent border-white/40'
              } ${isError ? 'border-red-400 bg-red-400' : ''}`}
            />
          ))}
        </div>

        {isProcessing && (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full mb-8"
          />
        )}
        
        {isError && (
          <p className="text-red-300 font-bold text-sm mb-4 animate-bounce font-sans">Invalid PIN</p>
        )}
      </div>

      <div className="w-full max-w-sm grid grid-cols-3 gap-y-6 mb-12">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'biometric', '0', 'back'].map((key, i) => {
          // If biometric is not enabled, skip the biometric key
          if (key === 'biometric' && !isBiometricEnabled) {
             return <div key={i} />;
          }

          return (
            <motion.button
              key={i}
              whileTap={key && key !== 'biometric' ? { scale: 0.9 } : {}}
              onClick={() => key && handleKeyPress(key)}
              className="h-16 flex items-center justify-center text-3xl font-bold active:bg-white/10 rounded-full transition-colors"
            >
              {key === 'back' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 opacity-70">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              ) : key === 'biometric' ? (
                <Fingerprint className="w-9 h-9 text-[#00bcd4] opacity-90 drop-shadow-[0_0_8px_rgba(0,188,212,0.6)]" strokeWidth={1.5} />
              ) : (
                key
              )}
            </motion.button>
          );
        })}
      </div>

      <button className="text-white/60 font-bold text-sm hover:text-white transition-colors mb-4 uppercase tracking-widest px-4 py-2 border border-white/20 rounded-full">
         Forgot PIN?
      </button>

      <div className="w-32 h-1.5 bg-white/20 rounded-full mb-2" />
    </div>
  );
}
