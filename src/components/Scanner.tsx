<!DOCTYPE html>

<html lang="en" style=""><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>ABA Mobile QR Scan</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'aba-dark': '#002636',
            'aba-header': '#005f73',
            'aba-green': '#a4c639',
            'surface': '#111415',
            'surface-container-low': '#191c1d',
          },
          fontFamily: {
            sans: ['Manrope', 'sans-serif'],
          }
        }
      }
    }
  </script>
<style data-purpose="custom-animations">
    @keyframes scanline {
      0% { top: 0%; }
      50% { top: 100%; }
      100% { top: 0%; }
    }
    .scan-line {
      animation: scanline 3s linear infinite;
    }
  </style>
</head>
<body class="bg-aba-dark text-white font-sans antialiased h-screen w-full flex justify-center items-center overflow-hidden">
<!-- BEGIN: Mobile Device Container -->
<div class="relative w-full max-w-[400px] h-full max-h-[850px] bg-black overflow-hidden shadow-2xl flex flex-col">
<!-- Simulated Camera Background -->
<div class="absolute inset-0 bg-[#0a0a0a] z-0"></div>
<!-- BEGIN: Header Section (Status Bar & Nav) -->
<header class="absolute top-0 left-0 right-0 bg-black/40 backdrop-blur-sm w-full z-30 flex flex-col pt-2 pb-3 px-4 shadow-sm text-white">
<!-- Status Bar Placeholder -->
<div class="flex justify-between items-center text-xs font-semibold mb-4 text-white">
<div class="flex space-x-1.5 items-center">
<!-- Signal Icon -->
<!-- Wifi Icon -->
<!-- Battery Icon -->
</div>
</div>
<!-- Navigation -->
<nav class="flex items-center">
<button class="mr-4 text-white hover:text-gray-200 transition-colors">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path></svg>
</button>
<h1 class="text-xl font-bold tracking-wide flex items-center gap-2">
          ABA' <span class="text-lg uppercase">Scan</span>
</h1>
</nav>
</header>
<!-- END: Header Section -->
<!-- BEGIN: Main Content Area -->
<main class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
<!-- Background Watermark -->
<div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
<span class="text-7xl font-bold tracking-widest whitespace-nowrap rotate-[-45deg]">ABA PAY</span>
</div>
<!-- BEGIN: Scanner Frame -->
<div class="relative w-[280px] h-[280px] z-10 flex-shrink-0">
<!-- Corner Brackets -->
<div class="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-aba-green rounded-tl-sm"></div>
<div class="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-aba-green rounded-tr-sm"></div>
<div class="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-aba-green rounded-bl-sm"></div>
<div class="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-aba-green rounded-br-sm"></div>
<!-- Scanning Line -->
<div class="absolute top-1/2 left-[-10%] right-[-10%] h-[2px] bg-aba-green shadow-[0_0_15px_3px_rgba(164,198,57,0.8)] scan-line z-20"></div>
</div>
<!-- END: Scanner Frame -->
</main>
<!-- END: Main Content Area -->
<!-- BEGIN: Action & Footer Overlay -->
<div class="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pt-12 pb-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
<!-- Action Buttons -->
<div class="flex justify-center gap-16 mb-10 w-full px-6">
<!-- Flash Button -->
<button class="flex flex-col items-center group pointer-events-auto">
<div class="w-12 h-12 rounded-full border border-gray-400 bg-black/40 backdrop-blur-sm flex items-center justify-center mb-2 group-active:bg-gray-800 transition-colors">
<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</div>
<span class="text-xs text-gray-200 font-medium">Flash</span>
</button>
<!-- Gallery Button -->
<button class="flex flex-col items-center group pointer-events-auto">
<div class="w-12 h-12 rounded-full border border-gray-400 bg-black/40 backdrop-blur-sm flex items-center justify-center mb-2 group-active:bg-gray-800 transition-colors">
<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</div>
<span class="text-xs text-gray-200 font-medium">Open QR</span>
</button>
</div>
<!-- BEGIN: Footer Section -->
<footer class="w-full flex flex-col items-center pointer-events-auto">
<!-- Partner Logos Row -->
<div class="flex items-center justify-center gap-2 mb-6 px-4 flex-wrap">
<!-- Placeholder colored blocks for logos to match the visual feel without external images -->
<div class="h-6 w-12 bg-[#008c9e] rounded flex items-center justify-center text-[8px] font-bold">BAKONG</div>
<div class="h-6 w-12 bg-[#00b4d8] rounded flex items-center justify-center text-[8px] font-bold">PAY</div>
<div class="h-6 w-12 bg-[#e63946] rounded flex items-center justify-center text-[8px] font-bold">KHQR</div>
<div class="h-6 w-10 bg-white rounded flex items-center justify-center text-[8px] font-bold text-[#1a1f71] italic">VISA</div>
<div class="h-6 w-10 bg-white rounded flex items-center justify-center relative overflow-hidden">
<div class="w-5 h-5 rounded-full bg-[#eb001b] absolute left-0 mix-blend-multiply opacity-80"></div>
<div class="w-5 h-5 rounded-full bg-[#f79e1b] absolute right-0 mix-blend-multiply opacity-80"></div>
</div>
</div>
<!-- Home Indicator -->
<div class="w-1/3 h-1 bg-white/50 rounded-full mt-2"></div>
</footer>
<!-- END: Footer Section -->
</div>
<!-- END: Action & Footer Overlay -->
</div>
<!-- END: Mobile Device Container -->
</body></html>
