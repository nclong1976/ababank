import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ShieldCheck, 
  Bell, 
  ChevronRight, 
  LogOut, 
  X,
  CreditCard,
  Settings,
  Award,
  Zap,
  Target,
  Fingerprint
} from 'lucide-react';

interface ProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    role: string;
    email?: string;
  };
  onLogout: () => void;
}

export default function ProfileOverlay({ isOpen, onClose, user, onLogout }: ProfileOverlayProps) {
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  useEffect(() => {
    const biometricSaved = localStorage.getItem('biometric_enabled');
    if (biometricSaved === 'true') {
      setIsBiometricEnabled(true);
    }
  }, []);

  const toggleBiometric = () => {
    const newValue = !isBiometricEnabled;
    setIsBiometricEnabled(newValue);
    localStorage.setItem('biometric_enabled', newValue.toString());
  };

  const menuItems = [
    { icon: <User className="w-5 h-5" />, label: 'Personal Information', subLabel: 'Manage your profile data' },
    { icon: <ShieldCheck className="w-5 h-5" />, label: 'Privacy & Security', subLabel: 'Password, PIN Settings' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', subLabel: 'Alerts, updates and news' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Banking Settings', subLabel: 'Limits, statements, tags' },
    { icon: <Settings className="w-5 h-5" />, label: 'System Preferences', subLabel: 'Language, App Theme, Appearance' },
  ];

  const stats = [
    { icon: <Target className="w-5 h-5 text-[#D4AF37]" />, value: '12', label: 'Goals' },
    { icon: <Award className="w-5 h-5 text-[#D4AF37]" />, value: '2.4k', label: 'Points' },
    { icon: <Zap className="w-5 h-5 text-[#D4AF37]" />, value: 'Level 5', label: 'Tier' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#121212] border border-gray-800 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Confirmation Overlay (Nested) */}
            <AnimatePresence>
              {showConfirmLogout && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <LogOut className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 font-sans uppercase tracking-tight">Sure you want to log out?</h3>
                  <p className="text-gray-400 text-sm mb-8 font-sans">You will need to enter your PIN again to access your account.</p>
                  
                  <div className="w-full flex gap-3">
                    <button 
                      onClick={() => setShowConfirmLogout(false)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs tracking-widest uppercase transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={onLogout}
                      className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xs tracking-widest uppercase transition-all shadow-lg shadow-red-500/20"
                    >
                      Log Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Header / User Info */}
            <div className="pt-12 pb-8 px-8 text-center bg-linear-to-b from-white/5 to-transparent">
              <div className="relative w-28 h-28 mx-auto mb-6">
                <div className="absolute inset-0 bg-[#D4AF37] blur-2xl opacity-20 rounded-full animate-pulse" />
                <div className="relative w-full h-full rounded-full border-2 border-[#D4AF37] p-1.5 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1a1a1a&color=D4AF37&size=200`} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1 uppercase font-sans">
                {user.name.toUpperCase()}
              </h2>
              <p className="text-[#D4AF37] text-xs font-semibold tracking-widest uppercase opacity-80 italic font-sans">
                {user.role === 'admin' ? 'System Administrator' : 'Senior Client Premium'}
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-8 py-6 border-y border-white/5 mx-8 font-sans">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center mb-1.5 opacity-80">
                    {stat.icon}
                  </div>
                  <div className="text-lg font-bold text-white leading-none mb-0.5">{stat.value}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Menu Sections */}
            <div className="p-6 space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
              
              {/* Biometric Toggle Section */}
              <motion.div 
                 initial={{ x: -10, opacity: 0 }}
                 animate={{ x: 0, opacity: 1 }}
                 className="group flex items-center p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00bcd4]/10 flex items-center justify-center text-[#00bcd4] group-hover:scale-110 transition-transform shadow-inner">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="flex-1 ml-4 text-left">
                  <div className="text-sm font-bold text-gray-200 font-sans">Biometric Login</div>
                  <div className="text-[10px] text-gray-500 font-medium font-sans uppercase tracking-tight">Enable fingerprint/FaceID</div>
                </div>
                {/* Custom Toggle */}
                <div 
                  onClick={toggleBiometric}
                  className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${isBiometricEnabled ? "bg-[#00bcd4]" : "bg-gray-700"}`}
                >
                  <motion.div 
                    initial={false}
                    animate={{ x: isBiometricEnabled ? 24 : 2 }}
                    className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                  />
                </div>
              </motion.div>

              {menuItems.map((item, index) => (
                <motion.div 
                   key={index}
                   initial={{ x: -10, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: index * 0.05 }}
                   className="group flex items-center p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer active:scale-[0.98] border border-transparent hover:border-white/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform shadow-inner">
                    {item.icon}
                  </div>
                  <div className="flex-1 ml-4 text-left">
                    <div className="text-sm font-bold text-gray-200 font-sans">{item.label}</div>
                    <div className="text-[10px] text-gray-500 font-medium font-sans uppercase tracking-tight">{item.subLabel}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
                </motion.div>
              ))}
            </div>

            {/* Footer: Logout */}
            <div className="p-8 border-t border-white/5 mt-2 bg-black/20">
              <button 
                onClick={() => setShowConfirmLogout(true)}
                className="w-full py-4 group bg-transparent border border-red-500/30 hover:border-red-500 text-red-500 rounded-2xl font-bold tracking-widest uppercase text-xs transition-all duration-500 flex justify-center items-center gap-3 hover:bg-red-500 hover:text-white shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] active:scale-95 font-sans"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                LOG OUT
              </button>
              <p className="text-center text-[9px] text-gray-600 font-medium mt-6 tracking-widest font-sans opacity-50 uppercase">
                ABA Mobile • Secure Session v4.2.1
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

