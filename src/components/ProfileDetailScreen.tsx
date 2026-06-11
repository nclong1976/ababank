import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Edit2, Shield, Settings, Key, User, Mail, MapPin, Phone, Calendar } from 'lucide-react';

interface ProfileDetailScreenProps {
  onBack: () => void;
  user: {
    name: string;
    role: string;
    email?: string;
  };
}

export default function ProfileDetailScreen({ onBack, user }: ProfileDetailScreenProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col font-sans overflow-hidden"
    >
      {/* Header section with gradient */}
      <div className="bg-[#005c7a] pt-12 pb-24 px-4 relative shrink-0">
        <div className="w-full flex items-center mb-6 relative z-10">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-colors">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="flex-1 text-center text-[19px] font-bold text-white mr-8 tracking-tight">Profile Details</h1>
        </div>

        {/* Decorative background vectors */}
        <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00bcd4] rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-16 pb-8 overflow-y-auto z-10">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-5 mb-5 flex flex-col items-center relative">
          <button className="absolute top-4 right-4 p-2 bg-[#f4f6f8] text-[#005c7a] rounded-full hover:bg-[#e9ecef] transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          
          <div className="relative w-20 h-20 mb-3">
            <div className="w-full h-full rounded-full border-[3px] border-white shadow-md overflow-hidden bg-white">
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=005c7a&color=fff&size=200`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-[#1f2937] capitalize tracking-tight">{user.name}</h2>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#D4AF37]/10 text-[#c29b22] text-[10px] font-bold uppercase tracking-widest mt-1.5 mb-2">
            Verfied Customer
          </div>
          <p className="text-[13px] text-gray-500 font-medium">Customer ID: 102 938 493</p>
        </div>

        {/* Personal Details Section */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] mb-5 overflow-hidden">
          <div className="bg-[#fcfdfd] py-3 px-5 border-b border-gray-100 mb-1">
            <h3 className="text-xs font-bold text-[#005c7a] uppercase tracking-wider">Personal Information</h3>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center py-4 px-5 border-b border-gray-50 m-0">
              <User className="w-5 h-5 text-gray-400 mr-4" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Full Name</p>
                <p className="text-[14px] text-gray-800 font-medium">{user.name.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center py-4 px-5 border-b border-gray-50 m-0">
              <Phone className="w-5 h-5 text-gray-400 mr-4" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Phone Number</p>
                <p className="text-[14px] text-gray-800 font-medium">+855 12 345 678</p>
              </div>
            </div>
            <div className="flex items-center py-4 px-5 border-b border-gray-50 m-0">
              <Mail className="w-5 h-5 text-gray-400 mr-4" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Email Address</p>
                <p className="text-[14px] text-gray-800 font-medium">{user.email || 'customer@gmail.com'}</p>
              </div>
            </div>
            <div className="flex items-center py-4 px-5 border-b border-gray-50 m-0">
              <Calendar className="w-5 h-5 text-gray-400 mr-4" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Date of Birth</p>
                <p className="text-[14px] text-gray-800 font-medium">15 Nov 1990</p>
              </div>
            </div>
            <div className="flex items-center py-4 px-5 border-b border-gray-50 m-0">
              <MapPin className="w-5 h-5 text-gray-400 mr-4" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Current Address</p>
                <p className="text-[14px] text-gray-800 font-medium">Phnom Penh, Cambodia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Account Level */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="bg-[#fcfdfd] py-3 px-5 border-b border-gray-100 mb-1">
            <h3 className="text-xs font-bold text-[#005c7a] uppercase tracking-wider">Account Security</h3>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center py-4 px-5 border-b border-gray-50">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-4 shrink-0">
                <Shield className="w-5 h-5 text-[#005c7a]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] text-gray-800 font-bold">Two-Factor Auth</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">Enabled via SMS</p>
              </div>
              <div className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">Active</div>
            </div>
            <div className="flex items-center py-4 px-5">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-4 shrink-0">
                <Key className="w-5 h-5 text-[#005c7a]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] text-gray-800 font-bold">Change PIN Base</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">Last changed 2 months ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center pb-8">
          <button className="text-[12px] font-bold text-red-500 uppercase tracking-widest px-6 py-3 border border-red-100 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors">
            Request Data Deletion
          </button>
        </div>

      </div>
    </motion.div>
  );
}
