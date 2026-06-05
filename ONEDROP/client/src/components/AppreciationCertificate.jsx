import React from 'react';

function formatDonationDate(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildDonorId(user) {
  const d = user?.lastDonationDate ? new Date(user.lastDonationDate) : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  const suffix = (user?._id?.slice(-2) || '01').toUpperCase();
  return `RAKT${dd}${mm}${yy}${suffix}`;
}

function donationsCount(user) {
  const pts = user?.rewardPoints || 0;
  if (pts >= 300) return 3;
  if (pts >= 150) return 2;
  return 1;
}

const DevagudiSignature = () => (
  <svg viewBox="0 0 120 40" className="h-8 mx-auto my-0.5 text-slate-700 fill-none stroke-current select-none" 
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 25 C25 20, 30 5, 22 5 C15 5, 12 25, 28 25 C44 25, 52 5, 45 5 C38 5, 30 30, 50 25 C70 20, 80 10, 75 10 C70 10, 65 30, 85 25 C105 20, 110 15, 105 15" />
    <path d="M25 22 C45 22, 70 20, 95 20" strokeWidth="1" opacity="0.8" />
  </svg>
);

const PatnamSignature = () => (
  <svg viewBox="0 0 120 40" className="h-8 mx-auto my-0.5 text-slate-700 fill-none stroke-current select-none" 
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 12 C25 15, 25 32, 22 32 C19 32, 17 8, 30 18 C43 28, 55 12, 50 12 C45 12, 40 32, 58 28 C76 24, 85 15, 80 15 C75 15, 70 30, 95 24 C110 20, 115 15, 110 15" />
    <path d="M38 22 C58 22, 80 20, 100 20" strokeWidth="1" opacity="0.8" />
  </svg>
);

const ONEDROPLogo = () => (
  <div className="flex flex-col items-center md:items-start select-none pointer-events-none mb-1">
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoDropGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c1272d" />
            <stop offset="100%" stopColor="#8d1b1f" />
          </linearGradient>
        </defs>
        {/* Droplet */}
        <path 
          d="M50 5 C50 5, 82 42, 82 66 A 32 32 0 0 1 18 66 C 18 42, 50 5, 50 5 Z" 
          fill="url(#logoDropGrad)" 
        />
        {/* White cupping hands */}
        <path 
          d="M 30 70 C 35 84, 65 84, 70 70 C 66 74, 58 76, 50 76 C 42 76, 34 74, 30 70 Z" 
          fill="white" 
        />
        <path 
          d="M 31 70 C 35 60, 42 64, 45 68 M 69 70 C 65 60, 58 64, 55 68" 
          stroke="white" 
          strokeWidth="4" 
          strokeLinecap="round" 
          fill="none" 
        />
        {/* Red Heart cradled in center */}
        <path 
          d="M50 62 C50 62, 45 56, 45 52.5 A 4 4 0 0 1 52.5 49 A 4 4 0 0 1 60 52.5 C60 56, 50 62, 50 62 Z" 
          fill="#c1272d" 
        />
      </svg>
      <div className="flex flex-col items-start -space-y-1">
        <span className="text-xl font-extrabold tracking-[0.1em] text-slate-800 uppercase font-sans">ONEDROP</span>
        <span className="text-[6.5px] font-bold text-slate-400 tracking-[0.15em] uppercase font-sans">Bridging Lives, Building Hope</span>
      </div>
    </div>
  </div>
);

const PresentedRibbon = () => (
  <div className="relative inline-block my-2 select-none">
    <svg viewBox="0 0 320 36" className="w-[240px] h-8 mx-auto md:mx-0" xmlns="http://www.w3.org/2000/svg">
      {/* Swallowtail Left Shadow fold */}
      <path d="M 15 8 L 30 18 L 15 28 L 35 28 L 35 8 Z" fill="#8d1b1f" />
      {/* Swallowtail Right Shadow fold */}
      <path d="M 305 8 L 290 18 L 305 28 L 285 28 L 285 8 Z" fill="#8d1b1f" />
      {/* Ribbon Body */}
      <rect x="30" y="4" width="260" height="24" fill="#c1272d" />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] z-10 -mt-1 shadow-sm font-sans md:justify-start md:pl-12">
      PROUDLY PRESENTED TO
    </span>
  </div>
);

const CornerDecorator = ({ className, style }) => (
  <svg 
    className={`absolute w-10 h-10 text-[#c38d21] pointer-events-none z-20 ${className || ''}`} 
    style={style} 
    viewBox="0 0 100 100" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M 5 95 L 5 5 L 95 5" />
    <path d="M 12 95 L 12 12 L 95 12" strokeWidth="0.75" opacity="0.7" />
    {/* Swirl flourishes inside the angle */}
    <path d="M 5 5 C 15 15, 20 30, 15 40 C 10 48, 0 45, 5 35 C 10 25, 25 10, 35 5" strokeWidth="1.25" />
    <circle cx="22" cy="22" r="2.5" fill="currentColor" />
  </svg>
);

const GoldSealRibbon = () => (
  <div className="absolute top-5 left-7 z-20 flex flex-col items-center select-none pointer-events-none print:hidden">
    {/* Ribbon Tails */}
    <div className="absolute top-10 flex gap-1 z-0">
      <svg className="w-10 h-14 drop-shadow-md" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
        <path d="M 12 0 L 4 65 L 18 55 L 32 65 Z" fill="#c1272d" />
        <path d="M 32 0 L 24 65 L 38 55 L 52 65 Z" fill="#8d1b1f" />
      </svg>
    </div>

    {/* Gold Seal scalloped badge */}
    <div className="relative w-16 h-16 flex items-center justify-center z-10 drop-shadow-lg">
      <svg viewBox="0 0 100 100" className="w-16 h-16 absolute" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f9d976" />
            <stop offset="30%" stopColor="#e9b646" />
            <stop offset="70%" stopColor="#fff2a1" />
            <stop offset="100%" stopColor="#c38d21" />
          </linearGradient>
        </defs>
        <path
          d="M 50 4 C 53 10, 58 10, 61 4 C 64 10, 69 10, 72 4 C 75 10, 80 10, 83 4 C 86 10, 91 10, 94 10 C 94 13, 94 18, 96 21 C 92 24, 92 28, 96 31 C 92 34, 92 38, 96 41 C 92 44, 92 48, 96 51 C 92 54, 92 58, 96 61 C 92 64, 92 68, 96 71 C 92 74, 92 78, 94 81 C 91 81, 86 81, 83 96 C 80 90, 75 90, 72 96 C 69 90, 64 90, 61 96 C 58 90, 53 90, 50 96 C 47 90, 42 90, 39 96 C 36 90, 31 90, 28 96 C 25 90, 20 90, 17 96 C 14 90, 9 90, 6 81 C 9 78, 9 74, 4 71 C 8 68, 8 64, 4 61 C 8 58, 8 54, 4 51 C 8 48, 8 44, 4 41 C 8 38, 8 34, 4 31 C 8 28, 8 24, 4 21 C 8 18, 8 14, 6 10 C 9 10, 14 10, 17 4 C 20 10, 25 10, 28 4 C 31 10, 36 10, 39 4 C 42 10, 47 10, 50 4 Z"
          fill="url(#goldGrad)"
        />
        <circle cx="50" cy="50" r="41" fill="url(#goldGrad)" stroke="#c38d21" strokeWidth="1" />
        <circle cx="50" cy="50" r="37" fill="none" stroke="#7d580f" strokeWidth="1.5" strokeDasharray="3,3" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#7d580f" strokeWidth="0.5" />
      </svg>
      {/* Inner Text */}
      <div className="absolute w-16 h-16 flex flex-col items-center justify-center text-center text-[#5c4207] pointer-events-none pt-0.5">
        <div className="flex gap-0.5 -mt-2 mb-0.5">
          <span className="text-[4.5px]">★</span>
          <span className="text-[5.5px]">★</span>
          <span className="text-[4.5px]">★</span>
        </div>
        <p className="text-[5px] font-black tracking-widest leading-none uppercase">THANK YOU</p>
        <p className="text-[5.5px] font-black tracking-widest leading-tight uppercase my-0.5">FOR SAVING</p>
        <p className="text-[6px] font-black tracking-widest leading-none uppercase">LIVES</p>
        {/* Laurel Wreath */}
        <svg viewBox="0 0 100 30" className="w-8 h-2.5 text-[#5c4207] fill-none stroke-current mt-0.5 opacity-90" strokeWidth="1.5">
          <path d="M 10 20 Q 25 5, 50 15 Q 75 5, 90 20" />
          <path d="M 25 15 L 22 10 M 35 12 L 32 6 M 45 14 L 43 7 M 55 14 L 57 7 M 65 12 L 68 6 M 75 15 L 78 10" />
        </svg>
      </div>
    </div>
  </div>
);

const CradledDropletGraphic = () => (
  <div className="relative w-[220px] h-[260px] select-none pointer-events-none flex flex-col items-center justify-center drop-shadow-xl z-20">
    {/* Faint gold light aura behind droplet */}
    <div className="absolute w-40 h-40 rounded-full bg-gradient-to-tr from-amber-200/10 to-[#c1272d]/5 blur-3xl" />

    {/* Giant Droplet shape */}
    <svg viewBox="0 0 160 200" className="w-[170px] h-[210px] absolute -mt-4" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="giantDropGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff4d4d" />
          <stop offset="40%" stopColor="#c1272d" />
          <stop offset="100%" stopColor="#6b0d10" />
        </linearGradient>
        <linearGradient id="glossGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.45" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path 
        d="M 80 8 C 80 8, 142 78, 142 125 A 62 62 0 0 1 18 125 C 18 78, 80 8, 80 8 Z" 
        fill="url(#giantDropGrad)" 
        stroke="#ff4d4d" 
        strokeWidth="1.5"
      />
      <path 
        d="M 80 15 C 80 15, 130 78, 130 115 A 50 50 0 0 1 30 115 C 30 78, 80 15, 80 15 Z" 
        fill="url(#glossGrad)" 
        opacity="0.25"
      />
      
      {/* Heartbeat pulse wave inside droplet */}
      <path 
        d="M 22 120 H 42 L 48 95 L 54 140 L 60 108 L 65 125 H 70" 
        stroke="white" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
        opacity="0.85"
      />
      <path 
        d="M 90 120 H 95 L 100 95 L 106 140 L 112 108 L 117 125 H 138" 
        stroke="white" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
        opacity="0.85"
      />

      {/* Three human figures standing with arms raised (Victory) in the center */}
      <circle cx="80" cy="98" r="4.5" fill="white" />
      <path d="M 75 107 C 75 105, 85 105, 85 107 L 84 135 H 76 Z" fill="white" />
      <path d="M 73 118 Q 80 102, 87 118" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />

      <circle cx="63" cy="107" r="3.5" fill="white" opacity="0.9" />
      <path d="M 59 114 C 59 112, 67 112, 67 114 L 66 135 H 60 Z" fill="white" opacity="0.9" />
      <path d="M 58 123 Q 63 110, 68 123" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />

      <circle cx="97" cy="107" r="3.5" fill="white" opacity="0.9" />
      <path d="M 93 114 C 93 112, 101 112, 101 114 L 100 135 H 94 Z" fill="white" opacity="0.9" />
      <path d="M 92 123 Q 97 110, 102 123" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
    </svg>

    {/* Cradling hands in gold gradient */}
    <svg viewBox="0 0 200 100" className="w-[190px] h-[95px] absolute bottom-2 z-10" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M 10 80 Q 25 70, 40 75 T 70 85 T 90 90 C 70 90, 50 82, 30 85" 
        stroke="url(#goldGrad)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        fill="none" 
      />
      <path 
        d="M 22 74 Q 38 65, 52 70 T 80 80" 
        stroke="url(#goldGrad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none" 
      />
      <path 
        d="M 190 80 Q 175 70, 160 75 T 130 85 T 110 90 C 130 90, 150 82, 170 85" 
        stroke="url(#goldGrad)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        fill="none" 
      />
      <path 
        d="M 178 74 Q 162 65, 148 70 T 120 80" 
        stroke="url(#goldGrad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none" 
      />
    </svg>
  </div>
);

const GoldDonationsStamp = ({ count }) => (
  <div className="relative flex flex-col items-center justify-center select-none -mt-3.5">
    <svg viewBox="0 0 100 100" className="w-13 h-13 drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" fill="url(#goldGrad)" stroke="#c38d21" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#7d580f" strokeWidth="1" strokeDasharray="3,3" />
      {/* Laurel wreath inside coin */}
      <path d="M 22 50 C 22 30, 50 20, 50 20 C 50 20, 78 30, 78 50 C 78 70, 50 80, 50 80 C 50 80, 22 70, 22 50 Z" stroke="#7d580f" strokeWidth="1" fill="none" opacity="0.5" />
      {/* Gold Star */}
      <path d="M 50 28 L 52 33 L 57 33 L 53 36 L 55 41 L 50 38 L 45 41 L 47 36 L 43 33 L 48 33 Z" fill="#7d580f" />
      {/* Tiny red droplet inside */}
      <path d="M 50 63 C 50 63, 56 68, 56 72 A 6 6 0 0 1 44 72 C 44 68, 50 63, 50 63 Z" fill="#c1272d" />
    </svg>
    {/* Value Overlay */}
    <div className="absolute w-13 h-13 flex flex-col items-center justify-center text-center pointer-events-none -mt-2.5">
      <p className="text-[4.5px] font-black text-amber-950 uppercase tracking-widest leading-none">DONATIONS</p>
      <p className="text-[5.5px] font-black text-amber-950 uppercase tracking-widest leading-none mt-0.5">MADE</p>
      <p className="text-xs font-black text-[#c1272d] leading-none mt-0.5">{count}</p>
    </div>
  </div>
);

const GoldDonorIdBadge = ({ donorId }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="relative w-7 h-7 bg-gradient-to-br from-[#f9d976] to-[#c38d21] rounded-full border border-amber-600 shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-rose-700" fill="currentColor">
        <path d="M 12 17.27 L 18.18 21 L 16.54 13.97 L 22 9.24 L 14.81 8.63 L 12 2 L 9.19 8.63 L 2 9.24 L 7.46 13.97 L 5.82 21 Z" />
      </svg>
      {/* Ribbon tails */}
      <div className="absolute top-6.5 flex gap-0.5">
        <div className="w-1 h-2.5 bg-[#c1272d] rounded-b-sm skew-x-[-15deg]" />
        <div className="w-1 h-2.5 bg-[#9f1239] rounded-b-sm skew-x-[15deg]" />
      </div>
    </div>
    <p className="text-[6.5px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5">Donor ID</p>
    <p className="text-[8px] font-black text-[#c1272d] leading-none mt-0.5">{donorId}</p>
  </div>
);

const TogetherSaveLives = () => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="w-7 h-7 flex items-center justify-center text-[#c1272d]">
      <svg viewBox="0 0 24 24" className="w-6.5 h-6.5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M 12 21.35 L 10.55 20.03 C 5.4 15.36 2 12.27 2 8.5 C 2 5.42 4.42 3 7.5 3 C 9.24 3 10.91 3.81 12 5.08 C 13.09 3.81 14.76 3 16.5 3 C 19.58 3 22 5.42 22 8.5 C 22 12.27 18.6 15.36 13.45 20.03 L 12 21.35 Z" />
        <path d="M 6 8.5 H 9 L 10.5 5.5 L 12 11.5 L 13.5 7 L 15 9.5 H 18" stroke="white" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <p className="text-[6.5px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5">Together, We</p>
    <p className="text-[8px] font-black text-[#c1272d] leading-none mt-0.5 uppercase">Save Lives</p>
  </div>
);

const GoldSignatureDivider = () => (
  <div className="flex items-center justify-center gap-1.5 select-none opacity-80">
    <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#c38d21]/60" />
    <span className="w-1 h-1 rounded-full bg-[#c38d21]" />
    <span className="w-1.5 h-1.5 rotate-45 bg-[#c38d21] flex-shrink-0" />
    <span className="w-1 h-1 rounded-full bg-[#c38d21]" />
    
    {/* Central Gold Stamp Circle */}
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f9d976] to-[#c38d21] border border-amber-600 flex items-center justify-center shadow-sm">
      <svg viewBox="0 0 100 100" className="w-4 h-4 text-rose-700" fill="currentColor">
        <circle cx="50" cy="35" r="12" />
        <path d="M 32 50 C 32 45, 68 45, 68 50 L 65 85 H 35 Z" />
        <circle cx="28" cy="48" r="9" />
        <path d="M 14 60 C 14 55, 42 55, 42 60 L 39 85 H 17 Z" />
        <circle cx="72" cy="48" r="9" />
        <path d="M 58 60 C 58 55, 86 55, 86 60 L 83 85 H 61 Z" />
      </svg>
    </div>
    
    <span className="w-1 h-1 rounded-full bg-[#c38d21]" />
    <span className="w-1.5 h-1.5 rotate-45 bg-[#c38d21] flex-shrink-0" />
    <span className="w-1 h-1 rounded-full bg-[#c38d21]" />
    <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#c38d21]/60" />
  </div>
);

const AppreciationCertificate = ({ user }) => {
  const donorId = buildDonorId(user);
  const donationDate = formatDonationDate(user?.lastDonationDate);
  const totalDonations = donationsCount(user);

  return (
    <div
      className="print-certificate-area relative w-full max-w-[820px] mx-auto bg-white text-[#1e293b] overflow-hidden min-h-[580px] shadow-2xl rounded-2xl border border-slate-200/50"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(193,39,45,0.012) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
        aspectRatio: '1.414 / 1',
      }}
    >
      {/* Curved organic swooshes on top-left and bottom-right corners */}
      {/* Top-Left Swoosh */}
      <svg className="absolute -top-1 -left-1 w-48 h-48 pointer-events-none z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 0 0 L 140 0 C 110 50, 50 110, 0 140 Z" fill="#c1272d" />
        <path d="M 0 0 L 110 0 C 85 40, 40 85, 0 110 Z" fill="#8d1b1f" opacity="0.9" />
        <path d="M 0 0 L 70 0 C 50 25, 25 50, 0 70 Z" fill="#e11d48" opacity="0.7" />
      </svg>
      {/* Bottom-Right Swoosh */}
      <svg className="absolute -bottom-1 -right-1 w-48 h-48 pointer-events-none z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 200 200 L 60 200 C 90 150, 150 90, 200 60 Z" fill="#c1272d" />
        <path d="M 200 200 L 90 200 C 115 160, 160 115, 200 90 Z" fill="#8d1b1f" opacity="0.9" />
        <path d="M 200 200 L 130 200 C 150 175, 175 150, 200 130 Z" fill="#e11d48" opacity="0.7" />
      </svg>

      {/* Faint Background Watermark elements */}
      {/* Droplet Watermark Left */}
      <div className="absolute top-[38%] left-10 opacity-[0.025] pointer-events-none z-0 select-none">
        <svg viewBox="0 0 100 100" className="w-32 h-32" fill="#c1272d">
          <path d="M50 5 C50 5, 82 42, 82 66 A 32 32 0 0 1 18 66 C 18 42, 50 5, 50 5 Z" />
        </svg>
      </div>
      {/* Faint Heartbeat top right */}
      <div className="absolute top-8 right-16 opacity-[0.06] pointer-events-none z-0 select-none text-rose-700">
        <svg viewBox="0 0 160 60" className="w-36 h-14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M 10 30 H 45 L 50 12 L 55 48 L 60 20 L 64 35 L 68 30 H 70" />
          <path d="M70 33 C70 33, 62 26, 62 21 A 4.5 4.5 0 0 1 70 16.5 A 4.5 4.5 0 0 1 78 21 C78 26, 70 33, 70 33 Z" fill="none" />
          <path d="M 72 30 H 74 L 78 12 L 83 48 L 88 20 L 92 35 L 96 30 H 150" />
        </svg>
      </div>

      {/* Elegant Gold Double Frame Borders */}
      <div className="absolute border border-[#c38d21]/60 pointer-events-none z-10" style={{ top: '16px', left: '16px', right: '16px', bottom: '16px' }} />
      <div className="absolute border-2 border-[#c38d21]/30 pointer-events-none z-10" style={{ top: '22px', left: '22px', right: '22px', bottom: '22px' }} />
      
      {/* Elegant Gold Corner Decorative flourishes */}
      <CornerDecorator style={{ top: '22px', left: '22px' }} />
      <CornerDecorator style={{ top: '22px', right: '22px' }} className="transform rotate-90" />
      <CornerDecorator style={{ bottom: '22px', left: '22px' }} className="transform -rotate-90" />
      <CornerDecorator style={{ bottom: '22px', right: '22px' }} className="transform rotate-180" />

      {/* Premium Top Left Gold Seal Badge */}
      <GoldSealRibbon />

      {/* Main Container Split: 65% Left (All Text/Metrics/Signatures) / 35% Right (Droplet SVG Graphic) */}
      <div className="relative z-10 p-10 md:p-12 flex flex-col md:flex-row gap-6 items-stretch justify-between h-full min-h-[580px]">
        
        {/* Left Column: 65% Content */}
        <div className="w-full md:w-[65%] flex flex-col justify-between h-full min-h-[480px]">
          
          {/* 1. Logo */}
          <div className="flex flex-col items-center md:items-start pl-2 mt-4 md:mt-2">
            <ONEDROPLogo />
          </div>

          {/* 2. Certificate Title & Ribbon */}
          <div className="flex flex-col items-center md:items-start mt-2">
            <div className="flex items-center gap-3">
              <span className="h-[1.5px] w-8 bg-gradient-to-r from-transparent to-[#c1272d]/70" />
              <h1
                className="text-4xl md:text-[45px] font-black text-[#c1272d] tracking-[0.2em] uppercase leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Certificate
              </h1>
              <span className="h-[1.5px] w-8 bg-gradient-to-l from-transparent to-[#c1272d]/70" />
            </div>
            
            <p className="text-[10px] font-bold tracking-[0.25em] text-slate-500 uppercase mt-1 font-sans pl-0.5">
              Of Appreciation
            </p>

            {/* —— ♦ —— Divider */}
            <div className="flex items-center gap-2 mt-1.5 select-none pl-0.5">
              <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#c1272d]/60" />
              <svg viewBox="0 0 24 24" className="w-2.25 h-2.25 text-[#c1272d] stroke-current fill-current">
                <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
              </svg>
              <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#c1272d]/60" />
            </div>

            <PresentedRibbon />
          </div>

          {/* 3. Recipient Name */}
          <div className="flex flex-col items-center md:items-start mt-1">
            <h1
              className="text-4xl md:text-[46px] text-[#c1272d] leading-none select-text pl-0.5"
              style={{ fontFamily: "'Great Vibes', cursive" }}
            >
              {user?.fullName || 'Valued Donor'}
            </h1>

            {/* Hollow diamond divider below name */}
            <div className="flex items-center gap-3 my-2 select-none pl-0.5">
              <span className="h-[1px] w-20 bg-gradient-to-r from-transparent to-[#c1272d]/50" />
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#c1272d] stroke-current fill-none" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
              </svg>
              <span className="h-[1px] w-20 bg-gradient-to-l from-transparent to-[#c1272d]/50" />
            </div>
          </div>

          {/* 4. Appreciation Paragraph Statement */}
          <p className="text-center md:text-left text-[11.5px] md:text-[12.5px] text-slate-600 leading-relaxed font-serif px-1 mt-1 max-w-xl">
            In sincere appreciation of your generous blood donation and{' '}
            <span className="text-[#c1272d] font-bold">selfless contribution</span> towards
            saving lives. Your act of kindness brings hope and makes a real difference in the lives
            of many.
          </p>

          {/* 5. Slogan & Symmetrical 5-Column Metrics Row */}
          <div className="w-full mt-3">
            {/* Slogan */}
            <div className="flex items-center justify-center md:justify-start gap-2.5 select-none font-sans text-[8.5px] font-black uppercase tracking-widest text-[#c1272d] mb-1.5 pl-0.5">
              <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-[#c1272d]" />
              <span>YOU DONATE BLOOD, YOU SAVE LIVES</span>
              <span className="h-[1px] w-10 bg-gradient-to-l from-transparent to-[#c1272d]" />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-5 gap-0.5 items-center justify-center py-2 px-1 border-t border-b border-slate-150 w-full max-w-[500px]">
              
              {/* Col 1: Blood Group */}
              <div className="flex flex-col items-center gap-0.5">
                <svg viewBox="0 0 100 100" className="w-6.5 h-6.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 12 C50 12, 78 48, 78 70 A 28 28 0 0 1 22 70 C 22 48, 50 12, 50 12 Z" fill="url(#logoDropGrad)" />
                </svg>
                <p className="text-[6px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5">Blood Group</p>
                <p className="text-[10px] font-black text-[#c1272d] leading-none mt-0.5">{user?.bloodGroup || 'O+'}</p>
              </div>

              {/* Col 2: Donation Date */}
              <div className="flex flex-col items-center gap-0.5 border-l border-slate-200/80">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#c1272d]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
                </svg>
                <p className="text-[6px] font-extrabold text-slate-500 uppercase tracking-wider mt-0.5">Donation Date</p>
                <p className="text-[8px] font-black text-[#c1272d] leading-none mt-0.5">{donationDate}</p>
              </div>

              {/* Col 3: Donations Made */}
              <div className="flex flex-col items-center justify-center border-l border-slate-200/80">
                <GoldDonationsStamp count={totalDonations} />
              </div>

              {/* Col 4: Donor ID */}
              <div className="flex flex-col items-center justify-center border-l border-slate-200/80">
                <GoldDonorIdBadge donorId={donorId} />
              </div>

              {/* Col 5: Together We Save Lives */}
              <div className="flex flex-col items-center justify-center border-l border-slate-200/80">
                <TogetherSaveLives />
              </div>

            </div>
          </div>

          {/* 6. Signatures */}
          <div className="flex justify-between items-end w-full max-w-[500px] mt-4 px-2">
            
            {/* Left Signee */}
            <div className="text-center">
              <DevagudiSignature />
              <div className="w-24 border-t border-slate-300 mx-auto" />
              <p className="text-[9px] font-bold text-slate-800 mt-1">Devagudi Jagadeeswar Reddy</p>
              <p className="text-[6.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">Founder, ONEDROP</p>
            </div>

            {/* Center custom signature wing badge divider */}
            <GoldSignatureDivider />

            {/* Right Signee */}
            <div className="text-center">
              <PatnamSignature />
              <div className="w-24 border-t border-slate-300 mx-auto" />
              <p className="text-[9px] font-bold text-slate-800 mt-1">Patnam Chinmaya Nanda</p>
              <p className="text-[6.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">Co-Founder, ONEDROP</p>
            </div>

          </div>

          {/* 7. Footer Quote Slogan */}
          <div className="text-center md:text-left select-none mt-3.5 w-full max-w-[500px] pb-2">
            <p className="text-slate-700 text-[10.5px] italic font-serif flex items-center justify-center md:justify-start gap-1.5 pl-2 leading-none">
              Be a Hero. Donate Blood. <span className="text-amber-500">★</span> <span className="text-[#c1272d] font-bold not-italic font-sans text-[9px] tracking-wider uppercase">Save Lives.</span> <span className="text-amber-500">★</span>
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5 italic font-serif opacity-80 pl-2 leading-tight">
              Thank you for being a hero. Your blood gives someone a second chance at life.
            </p>
          </div>

        </div>

        {/* Right Column: 35% Droplet Cradled SVG Graphic */}
        <div className="w-full md:w-[35%] flex items-center justify-center pr-2 mt-6 md:mt-0">
          <CradledDropletGraphic />
        </div>

      </div>

    </div>
  );
};

export default AppreciationCertificate;
