import React, { useState, useEffect } from 'react';

interface StatusBarProps {
  className?: string;
  customTime?: string;
}

export default function StatusBar({ className = '', customTime }: StatusBarProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    if (customTime) {
      setTimeStr(customTime);
      return;
    }
    const updateTime = () => {
      const vnTime = new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      // Format to look like standard phone clock (e.g. 9:41AM or 11:51PM)
      setTimeStr(vnTime.replace(/\s/g, ''));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [customTime]);

  return (
    <div className={`w-full flex justify-between items-center px-6 py-2 text-white/95 text-[12px] font-bold font-sans select-none tracking-tight shrink-0 ${className}`}>
      <span>{timeStr}</span>
      <div className="flex items-center gap-1.5">
        {/* Signal Icon */}
        <svg className="w-3.5 h-3.5 opacity-90" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 22h20V2z" />
        </svg>
        {/* Wifi Icon */}
        <svg className="w-3.5 h-3.5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="0.5" fill="currentColor" stroke="none" />
        </svg>
        {/* Battery Icon */}
        <div className="w-5.5 h-3 border border-white/80 rounded-xs p-0.5 flex items-center opacity-90">
          <div className="bg-white h-full w-3.5 rounded-2xs" />
          <div className="w-0.5 h-1 bg-white/80 rounded-r-xs ml-0.5" />
        </div>
      </div>
    </div>
  );
}
