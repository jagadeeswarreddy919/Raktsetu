import React from 'react';
import { Droplet, Calendar, Heart, Award } from 'lucide-react';

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

const RaktsetuLogo = () => (
  <svg viewBox="0 0 120 48" className="h-12 w-auto mx-auto" aria-hidden="true">
    <path
      d="M18 8c0 0-8 10-8 18a10 10 0 1 0 20 0C30 18 18 8 18 8z"
      fill="#C1272D"
    />
    <path
      d="M28 24c0-6 6-12 14-12 4 0 8 2 10 6M42 18c8 0 14 6 14 14s-6 14-14 14"
      stroke="#C1272D"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="52" cy="32" r="4" fill="#C1272D" />
    <path
      d="M58 14v28M58 14c6-2 12 0 14 6M58 42c6 2 12 0 14-6"
      stroke="#1e293b"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="72" cy="18" r="3" fill="#1e293b" />
    <path d="M68 28 Q72 36 76 28" stroke="#1e293b" strokeWidth="2" fill="none" />
  </svg>
);

const ThankYouSeal = () => (
  <div className="absolute top-4 left-4 z-20 flex flex-col items-center">
    <div className="relative w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#f4d03f] via-[#d4af37] to-[#b8860b] shadow-lg flex items-center justify-center border-2 border-[#c9a227]">
      <div className="absolute inset-1 rounded-full border border-dashed border-white/40" />
      <div className="text-center px-1">
        <p className="text-[6px] font-bold text-[#5c4a00] leading-tight tracking-wide">THANK YOU</p>
        <p className="text-[7px] font-black text-[#5c4a00] leading-tight">DONOR</p>
      </div>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <span
          key={deg}
          className="absolute w-1 h-1 bg-[#5c4a00]/60 rounded-full"
          style={{
            top: '50%',
            left: '50%',
            transform: `rotate(${deg}deg) translateY(-28px)`,
          }}
        />
      ))}
    </div>
    <div className="flex gap-0.5 -mt-1">
      <div className="w-3 h-8 bg-[#C1272D] rounded-b-sm skew-x-[-6deg]" />
      <div className="w-3 h-8 bg-[#C1272D] rounded-b-sm skew-x-[6deg]" />
    </div>
  </div>
);

const AppreciationCertificate = ({ user }) => {
  const donorId = buildDonorId(user);
  const donationDate = formatDonationDate(user?.lastDonationDate);
  const totalDonations = donationsCount(user);

  return (
    <div
      className="print-certificate-area relative w-full max-w-[820px] mx-auto bg-[#faf8f5] text-[#1e293b] overflow-hidden min-h-[580px] shadow-inner"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(193,39,45,0.04) 1px, transparent 0)`,
        backgroundSize: '20px 20px',
      }}
    >
      {/* Corner swooshes */}
      <div
        className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-[#C1272D] opacity-90"
        style={{ clipPath: 'ellipse(70% 60% at 80% 20%)' }}
      />
      <div
        className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-[#C1272D] opacity-90"
        style={{ clipPath: 'ellipse(65% 55% at 25% 75%)' }}
      />

      {/* Watermark */}
      <Droplet
        className="absolute right-8 top-1/2 -translate-y-1/2 w-40 h-40 text-[#C1272D]/[0.06] pointer-events-none"
        strokeWidth={1}
      />

      {/* Double border frame */}
      <div className="absolute inset-3 border-2 border-[#C1272D] pointer-events-none" />
      <div className="absolute inset-5 border border-[#C1272D]/70 pointer-events-none" />

      <ThankYouSeal />

      <div className="relative z-10 px-8 py-10 md:px-12 md:py-12 text-center">
        {/* Header */}
        <div className="mb-4 pt-2">
          <RaktsetuLogo />
          <p className="text-xl font-bold tracking-tight text-[#1e293b] mt-1 font-sans">Raktsetu</p>
          <h2
            className="text-4xl md:text-5xl font-black text-[#C1272D] tracking-wide mt-3 uppercase"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Certificate
          </h2>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="h-px w-16 bg-[#C1272D]/40" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#C1272D]" />
            <p className="text-xs md:text-sm font-bold tracking-[0.25em] text-[#1e293b] uppercase">
              Of Appreciation
            </p>
            <span className="w-1.5 h-1.5 rotate-45 bg-[#C1272D]" />
            <span className="h-px w-16 bg-[#C1272D]/40" />
          </div>
        </div>

        {/* Presented to ribbon */}
        <div className="inline-block bg-[#C1272D] text-white text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase px-8 py-1.5 shadow-md">
          Proudly Presented To
        </div>

        <h1
          className="text-4xl md:text-5xl text-[#C1272D] mt-4 mb-2 leading-tight"
          style={{ fontFamily: "'Great Vibes', cursive" }}
        >
          {user?.fullName || 'Valued Donor'}
        </h1>

        <div className="flex items-center justify-center gap-2 my-3">
          <span className="h-px w-24 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
          <span className="w-2 h-2 rotate-45 border border-[#d4af37]" />
          <span className="h-px w-24 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        </div>

        {/* Body */}
        <p className="max-w-xl mx-auto text-sm md:text-[15px] text-[#334155] leading-relaxed font-serif px-2">
          In sincere appreciation of your generous blood donation and{' '}
          <span className="text-[#C1272D] font-semibold">selfless contribution</span> towards
          saving lives. Your act of kindness brings hope and makes a real difference in the lives
          of many.
        </p>

        <p className="text-[#C1272D] text-xs font-bold tracking-widest mt-4 uppercase">
          ♥ You Donate Blood, You Save Lives ♥
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-2 md:gap-4 mt-8 max-w-2xl mx-auto items-end">
          <div className="flex flex-col items-center gap-1">
            <Droplet className="w-6 h-6 text-[#C1272D] fill-[#C1272D]/20" />
            <p className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">Blood Group</p>
            <p className="text-sm font-black text-[#1e293b]">{user?.bloodGroup || 'O+'}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Calendar className="w-6 h-6 text-[#C1272D]" />
            <p className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">Donation Date</p>
            <p className="text-[11px] md:text-xs font-black text-[#1e293b] leading-tight">{donationDate}</p>
          </div>

          <div className="flex flex-col items-center -mt-2">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-dashed border-[#C1272D] flex items-center justify-center p-2 bg-white/80 shadow-sm">
              <p className="text-[7px] md:text-[8px] font-bold text-[#C1272D] leading-tight text-center uppercase">
                A Drop of Kindness
                <br />
                A Life Saved
                <span className="block text-[10px] mt-0.5">♥</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Heart className="w-6 h-6 text-[#C1272D] fill-[#C1272D]/30" />
            <p className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">Donations Made</p>
            <p className="text-sm font-black text-[#1e293b]">{totalDonations}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Award className="w-6 h-6 text-[#C1272D]" />
            <p className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">Donor ID</p>
            <p className="text-[9px] md:text-[10px] font-black text-[#1e293b] leading-tight">{donorId}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end max-w-lg mx-auto mt-10 px-4">
          <div className="text-center">
            <p
              className="text-2xl text-[#475569] -mb-1 h-8"
              style={{ fontFamily: "'Great Vibes', cursive" }}
            >
              Anita Verma
            </p>
            <div className="w-28 border-t border-[#94a3b8] mx-auto" />
            <p className="text-[10px] font-bold text-[#1e293b] mt-1">Dr. Anita Verma</p>
            <p className="text-[9px] text-[#64748b] uppercase tracking-wide">Medical Director</p>
          </div>

          <Heart className="w-5 h-5 text-[#C1272D] fill-[#C1272D]/20 mb-6 hidden sm:block" />

          <div className="text-center">
            <p
              className="text-2xl text-[#475569] -mb-1 h-8"
              style={{ fontFamily: "'Great Vibes', cursive" }}
            >
              Vikram Singh
            </p>
            <div className="w-28 border-t border-[#94a3b8] mx-auto" />
            <p className="text-[10px] font-bold text-[#1e293b] mt-1">Vikram Singh</p>
            <p className="text-[9px] text-[#64748b] uppercase tracking-wide">Founder, Raktsetu</p>
          </div>
        </div>

        <p className="text-[10px] text-[#64748b] mt-6 italic font-serif">
          Thank you for being a hero. Your blood gives someone a second chance at life.
        </p>
      </div>
    </div>
  );
};

export default AppreciationCertificate;
