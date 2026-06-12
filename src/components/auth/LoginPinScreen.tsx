import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

interface LoginPinScreenProps {
  onSuccess: (user: any) => void;
  userName: string;
}

export default function LoginPinScreen({ onSuccess, userName }: LoginPinScreenProps) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [authMode, setAuthMode] = useState<'pin' | 'registerPhone' | 'registerPin' | 'loginPhone' | 'loginPinMode'>('pin');
  
  // Registration and Login states
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    // Check if biometric is enabled for this user device
    const biometricSaved = localStorage.getItem('biometric_enabled');
    if (biometricSaved === 'true') {
      setIsBiometricEnabled(true);
      // Auto prompt on load if it's enabled
      setTimeout(() => setShowBiometricPrompt(true), 500);
    }
  }, []);

  const logSecurityActivity = (action: string, status: 'success' | 'failed') => {
    try {
      const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      logs.unshift({
        id: Date.now().toString(),
        action,
        status,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('security_logs', JSON.stringify(logs.slice(0, 50)));
    } catch (err) {}
  };

  const handleBiometricAuth = async () => {
    setIsProcessing(true);
    setShowBiometricPrompt(false);
    
    try {
      const phone = localStorage.getItem('savedUserPhone');
      if (!phone) {
        throw new Error("Please login with Phone & PIN first.");
      }

      if ((window as any).ReactNativeWebView) {
        // Native app bridge fallback
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'BIOMETRIC_AUTH_REQUEST' }));
        await new Promise(r => setTimeout(r, 1000));
        
        const res = await fetch('/api/auth/biometric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName })
        });
        const data = await res.json();
        if (data.ok) {
          logSecurityActivity('Biometric Login', 'success');
          onSuccess(data.user);
        } else {
          throw new Error("Biometric auth failed");
        }
      } else {
        const resp = await fetch('/api/auth/webauthn/generate-authentication-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const data = await resp.json();
        if (!data.ok) throw new Error(data.error || 'Failed to generate options');

        const asseResp = await startAuthentication({ optionsJSON: data.options });

        const verificationResp = await fetch('/api/auth/webauthn/verify-authentication', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            response: asseResp
          }),
        });
        
        const verificationJSON = await verificationResp.json();
        if (verificationJSON.ok && verificationJSON.user) {
          logSecurityActivity('Biometric Login', 'success');
          onSuccess(verificationJSON.user);
        } else {
          throw new Error(verificationJSON.error || "Biometric auth failed");
        }
      }
    } catch (err: any) {
      console.error('Biometric error:', err);
      logSecurityActivity('Biometric Login', 'failed');
      setIsError(true);
      setErrorMessage(err.message || 'Biometric verification failed');
      setPin('');
      setIsProcessing(false);
    }
  };

  const handleRegister = async (phone: string, pin: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/auth/register-instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin })
      });
      const data = await res.json();
      if (data.ok) {
        onSuccess(data.user);
      } else {
        setErrorMessage(data.error || 'Registration failed');
        setIsError(true);
        setPin('');
      }
    } catch (err) {
      setErrorMessage('Server error');
      setIsError(true);
      setPin('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoginPhone = async (phone: string, pinCode: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/auth/login-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin: pinCode })
      });
      const data = await res.json();
      if (data.ok) {
        onSuccess(data.user);
      } else {
        setErrorMessage(data.error || 'Invalid credential');
        setIsError(true);
        setPin('');
      }
    } catch (err) {
      setErrorMessage('Server error');
      setIsError(true);
      setPin('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoginPin = async (p: string) => {
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
        setErrorMessage('Invalid PIN');
        setPin('');
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setErrorMessage('Server error');
      setPin('');
    } finally {
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
        if (authMode === 'registerPin') {
           handleRegister(phoneInput, newPin);
        } else if (authMode === 'loginPinMode') {
           handleLoginPhone(phoneInput, newPin);
        } else {
           handleLoginPin(newPin);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00557e] to-[#003855] flex flex-col items-center p-6 font-sans text-white relative">
      <AnimatePresence>
        {showBiometricPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#003855]/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white text-black p-8 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[85vw] w-full max-w-sm"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Fingerprint className="w-8 h-8 text-[#00bcd4]" />
              </div>
              <h2 className="text-xl font-bold mb-2 tracking-tight text-[#003855]">Biometric Login</h2>
              <p className="text-gray-500 font-medium text-sm text-center max-w-[200px] mb-8">
                Confirm your face or fingerprint to continue
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

      {/* Top action area (e.g. language toggle or close) */}
      <div className="w-full flex justify-end mb-8 pt-4">
        <div className="bg-white/10 rounded-full px-3 py-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10">
          <span className="text-white opacity-50">EN</span>
          <span className="w-px h-3 bg-white/30" />
          <span className="text-white">KH</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mt-4">
        {authMode === 'pin' && (
          <div className="relative mb-6 flex flex-col items-center group cursor-pointer" onClick={() => { if(isBiometricEnabled) setShowBiometricPrompt(true) }}>
            <div className="absolute inset-0 bg-[#00bcd4]/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-28 h-28 rounded-full border-[3px] border-white overflow-hidden shadow-2xl bg-[#003855] mb-6">
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=00bcd4&color=fff&size=150`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold mb-2 font-sans tracking-tight">Hello! {userName}</h1>
            <p className="text-white/60 mb-6 uppercase tracking-widest text-xs font-bold font-sans">ENTER PIN</p>
          </div>
        )}

        {(authMode === 'registerPin' || authMode === 'loginPinMode') && (
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-2xl font-bold mb-2 font-sans tracking-tight">
              {authMode === 'registerPin' ? 'Create PIN' : 'Enter PIN'}
            </h1>
            <p className="text-white/60 uppercase tracking-widest text-xs font-bold font-sans">For {phoneInput}</p>
          </div>
        )}

        {(authMode === 'registerPhone' || authMode === 'loginPhone') && (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm w-full px-6">
             <h1 className="text-2xl font-bold mb-6 font-sans tracking-tight">{authMode === 'registerPhone' ? 'Tạo Tài Khoản Mới' : 'Đăng Nhập'}</h1>
             <input 
               type="tel"
               placeholder="Số điện thoại"
               value={phoneInput}
               onChange={e => setPhoneInput(e.target.value)}
               className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-xl text-center text-white outline-none focus:border-[#00bcd4] transition-all mb-6"
             />
             <button 
               onClick={() => {
                  if (!phoneInput) return;
                  if (authMode === 'registerPhone') setAuthMode('registerPin');
                  else setAuthMode('loginPinMode');
               }}
               className="w-full py-4 bg-[#00bcd4] rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all"
               disabled={!phoneInput}
             >
               Tiếp Tục
             </button>
             <button 
               onClick={() => setAuthMode('pin')}
               className="mt-6 text-white/60 font-medium text-sm"
             >
               Quay lại
             </button>
          </div>
        )}
        
        {(authMode === 'pin' || authMode === 'registerPin' || authMode === 'loginPinMode') && (
          <>
            {/* Dynamic dots for PIN */}
            <div className="flex gap-4 mb-16 h-4 items-center justify-center">
              {[...Array(4)].map((_, i) => (
                <motion.div 
                  key={i}
                  animate={isError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    pin.length > i 
                      ? 'bg-white scale-125 shadow-[0_0_12px_rgba(255,255,255,1)] border-transparent' 
                      : 'bg-transparent border-2 border-white/30'
                  } ${isError ? 'border-red-400 bg-red-400 !shadow-[0_0_12px_rgba(248,113,113,0.8)]' : ''}`}
                />
              ))}
            </div>

            {isError && errorMessage && (
              <p className="text-red-300 font-bold text-sm mb-4 font-sans">{errorMessage}</p>
            )}

            {isProcessing && (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-4 border-white/20 border-t-white rounded-full z-10"
              />
            )}
          </>
        )}
      </div>

      {(authMode === 'pin' || authMode === 'registerPin' || authMode === 'loginPinMode') && (
        <div className="w-full max-w-xs grid grid-cols-3 gap-x-6 gap-y-7 mb-10 px-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'biometric', '0', 'back'].map((key, i) => {
            if (key === 'biometric' && (!isBiometricEnabled || authMode !== 'pin')) {
               return <div key={i} />;
            }

            return (
              <motion.button
                key={i}
                whileTap={key && key !== 'biometric' ? { scale: 0.85, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
                onClick={() => key && handleKeyPress(key)}
                className="h-[72px] flex items-center justify-center text-[34px] font-medium rounded-full transition-colors font-sans w-[72px] mx-auto select-none"
              >
                {key === 'back' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]">
                    <path d="M21 12H3m0 0l7-7m-7 7l7 7" />
                  </svg>
                ) : key === 'biometric' ? (
                  <Fingerprint className="w-[34px] h-[34px] text-[#00bcd4] drop-shadow-[0_0_10px_rgba(0,188,212,0.5)]" strokeWidth={1.5} />
                ) : (
                  key
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {authMode === 'pin' && (
        <div className="flex flex-col items-center gap-4 mb-6">
          <button className="text-white/60 text-[13px] font-medium tracking-wide hover:text-white transition-colors active:text-white/40">
            Forgot PIN?
          </button>
          
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-[#00bcd4]">
             <button onClick={() => { setErrorMessage(''); setPhoneInput(''); setAuthMode('registerPhone'); }}>Tạo tài khoản mới</button>
             <span className="text-white/30 truncate">|</span>
             <button onClick={() => { setErrorMessage(''); setPhoneInput(''); setAuthMode('loginPhone'); }}>Đăng nhập bằng SĐT</button>
          </div>
        </div>
      )}

      {(authMode === 'loginPinMode' || authMode === 'registerPin') && (
        <button 
          onClick={() => { setAuthMode(authMode === 'registerPin' ? 'registerPhone' : 'loginPhone'); setPin(''); setIsError(false); }}
          className="text-white/60 text-[13px] font-medium tracking-wide mb-6 hover:text-white transition-colors active:text-white/40"
        >
          Back
        </button>
      )}

      {(authMode === 'registerPhone' || authMode === 'loginPhone') && (
        <div className="mb-6 h-[40px]"></div>
      )}

      <div className="w-32 h-1.5 bg-white/20 rounded-full mb-1" />
    </div>
  );
}
