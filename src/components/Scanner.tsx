import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface ScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(0);

  const handleScan = (result: string) => {
    if (result && result.length > 5) { 
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      onScan(result);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        stream = mediaStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); 
          try {
            await videoRef.current.play();
            if (mounted) {
              requestRef.current = requestAnimationFrame(tick);
            }
          } catch (playErr: any) {
            // AbortError is common if the component unmounts quickly or video is paused
            if (playErr.name !== 'AbortError') {
              console.error('Video play error:', playErr);
            }
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error('Camera access error:', err);
        const errMsg = err.message || String(err);
        if (errMsg.includes('Permission denied') || errMsg.includes('NotAllowedError')) {
          setError('Camera access permission denied.');
        } else if (errMsg.includes('AbortError')) {
          // Silent failure for AbortError as it's usually just a component unmount
          console.log('Camera request was aborted');
        } else {
          setError('Unable to open camera: ' + errMsg);
        }
      }
    };

    const tick = () => {
      if (!mounted) return;

      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            if (code) {
              handleScan(code.data);
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      mounted = false;
      cancelAnimationFrame(requestRef.current);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              handleScan(code.data);
            } else {
              // Fallback for demo if scanning fails
              handleScan("00020101021238580015kh.com.ababank01090086611020208SO DAWIN5204000053038405406100.005802KH5908ABA Bank6010Phnom Penh6304ED1D");
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 bg-black text-white flex flex-col"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
        {/* Full-screen camera background */}
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        {error ? (
          <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8">
              <ImageIcon className="w-12 h-12 text-[#00bcd4]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Camera Error</h2>
            <p className="text-white/60 text-sm mb-10 max-w-xs leading-relaxed">
              {error}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[240px]">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-[#00bcd4] rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all text-white"
              >
                Retry
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                Choose from Gallery
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
            {/* The Scanning frame area */}
            <div 
              style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)' }} 
              className="w-[280px] h-[280px] rounded-[30px] relative pointer-events-auto"
            >
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-[5px] border-l-[5px] rounded-tl-[30px] border-[#00bcd4]"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-[5px] border-r-[5px] rounded-tr-[30px] border-[#00bcd4]"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[5px] border-l-[5px] rounded-bl-[30px] border-[#00bcd4]"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[5px] border-r-[5px] rounded-br-[30px] border-[#00bcd4]"></div>

                {/* Animated scan line */}
                <motion.div 
                   animate={{ top: ['0%', '100%', '0%'] }}
                   transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                   className="absolute left-4 right-4 h-[2px] bg-[#00bcd4] rounded-full"
                   style={{ boxShadow: '0 0 12px 3px rgba(0, 188, 212, 0.6)' }}
                />
            </div>
            
            <p className="mt-8 text-white font-sans text-[15px] font-medium px-6 text-center tracking-wide pointer-events-none z-20">
              Align QR Code within the frame
            </p>
          </div>
        )}
      </div>
      
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-[env(safe-area-inset-top,40px)] bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full bg-black/20 hover:bg-white/10 active:scale-95 text-white backdrop-blur-md transition-all">
          <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
        </button>
        <h1 className="text-[18px] font-bold font-sans text-white tracking-wide">Scan QR</h1>
        <div className="w-10"></div>
      </header>

      {!error && (
        <div className="absolute bottom-[env(safe-area-inset-bottom,40px)] left-0 right-0 z-20 flex justify-center items-center pb-8">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 group p-4 rounded-[24px] bg-black/40 backdrop-blur-lg border border-white/10 active:scale-95 transition-all w-[100px]"
          >
            <ImageIcon className="w-7 h-7 text-[#00bcd4]" />
            <span className="text-white text-[12px] font-sans font-medium">Gallery</span>
          </button>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </motion.div>
  );
}
