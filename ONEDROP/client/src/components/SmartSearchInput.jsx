import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Droplet, Check, X } from 'lucide-react';
import { STATES_DATA } from '../utils/statesData';

const SmartSearchInput = ({ onFilterUpdate, placeholder = "Search (e.g. O+ Kadapa, AB- Mumbai)..." }) => {
  const [query, setQuery] = useState('');
  const [detectedBg, setDetectedBg] = useState(null);
  const [detectedLoc, setDetectedLoc] = useState(null);

  // Compile flat location registry on mount for fast matching
  const flatLocations = useMemo(() => {
    const list = [];
    Object.keys(STATES_DATA).forEach(st => {
      Object.keys(STATES_DATA[st]).forEach(dst => {
        STATES_DATA[st][dst].forEach(cty => {
          list.push({
            label: `${cty}, ${dst}, ${st}`,
            city: cty,
            district: dst,
            state: st
          });
        });
      });
    });
    return list;
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setDetectedBg(null);
      setDetectedLoc(null);
      onFilterUpdate({ bloodGroup: '', state: '', district: '', city: '' });
      return;
    }

    let bg = null;
    let loc = null;

    // 1. Detect Blood Group using Regex (A/B/AB/O with +/-)
    const bgMatch = query.match(/\b(A|B|AB|O)[+-]\b/i);
    if (bgMatch) {
      bg = bgMatch[0].toUpperCase();
    }

    // 2. Parse geographical token
    // Remove the blood group token from search string to prevent mis-matching
    const cleanQuery = query.replace(/\b(A|B|AB|O)[+-]\b/i, '').trim();
    if (cleanQuery.length >= 2) {
      // Find the first location that contains our cleaned string
      const matched = flatLocations.find(l => 
        l.city.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        l.district.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        l.state.toLowerCase().includes(cleanQuery.toLowerCase())
      );
      if (matched) {
        loc = matched;
      }
    }

    setDetectedBg(bg);
    setDetectedLoc(loc);

    // Call the parent update callback
    onFilterUpdate({
      bloodGroup: bg || '',
      state: loc?.state || '',
      district: loc?.district || '',
      city: loc?.city || ''
    });

  }, [query, flatLocations]);

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="space-y-3 w-full">
      <div className="relative flex items-center bg-white/5 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-inner focus-within:border-primary-500/50 transition-all backdrop-blur-md">
        <div className="pl-4 pr-2 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full py-3.5 pr-12 bg-transparent text-slate-800 dark:text-white font-semibold text-xs outline-none placeholder:text-slate-400/80"
        />
        {query && (
          <button 
            type="button"
            onClick={handleClear}
            className="absolute right-4 p-1 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dynamic Filter Detection Status Indicator */}
      {(detectedBg || detectedLoc) && (
        <div className="flex flex-wrap gap-2 animate-fade-in text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 text-slate-400 uppercase tracking-widest mr-1">🔍 Extracted Filters:</span>
          {detectedBg && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-500/10 text-primary-600 border border-primary-500/20 rounded-lg">
              <Droplet className="w-3.5 h-3.5 fill-primary-600 animate-pulse" />
              Blood Group: {detectedBg}
            </span>
          )}
          {detectedLoc && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg">
              <MapPin className="w-3.5 h-3.5" />
              Location: {detectedLoc.city}, {detectedLoc.state}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 text-emerald-500">
            <Check className="w-3.5 h-3.5" /> Parsed & Live-Filtering
          </span>
        </div>
      )}
    </div>
  );
};

export default SmartSearchInput;
