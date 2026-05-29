import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Phone, Hospital, Search } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { STATES_DATA } from '../utils/statesData';

const CampaignHub = () => {
  const [drives, setDrives] = useState([]);
  
  // Cascade filters
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');

  const fetchDrives = async () => {
    try {
      let query = `${API_URL}/api/campaigns`;
      const params = [];
      if (state) params.push(`state=${state}`);
      if (district) params.push(`district=${district}`);
      if (city) params.push(`city=${city}`);
      if (params.length > 0) {
        query += `?${params.join('&')}`;
      }

      const res = await axios.get(query);
      setDrives(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [state, district, city]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-black">Blood Donation Camps & Drives</h1>
        <p className="text-sm text-slate-500">Participate in organized medical donation campaigns in your vicinity to secure regional stock reserves.</p>
      </div>

      {/* Dynamic filters card */}
      <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">State</label>
          <select
            value={state}
            onChange={(e) => { setState(e.target.value); setDistrict(''); setCity(''); }}
            className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All States</option>
            {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">District</label>
          <select
            value={district}
            disabled={!state}
            onChange={(e) => { setDistrict(e.target.value); setCity(''); }}
            className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs disabled:opacity-50"
          >
            <option value="">All Districts</option>
            {state && Object.keys(STATES_DATA[state]).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">City</label>
          <select
            value={city}
            disabled={!district}
            onChange={(e) => setCity(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs disabled:opacity-50"
          >
            <option value="">All Cities</option>
            {state && district && STATES_DATA[state][district].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {drives.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-8">
          {drives.map((drv) => (
            <div key={drv._id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden flex flex-col justify-between">
              {drv.bannerImage && (
                <img src={drv.bannerImage} alt={drv.title} className="w-full h-44 object-cover" />
              )}
              <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded">
                    {drv.status}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-snug">{drv.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3">{drv.description}</p>
                </div>

                <div className="space-y-2 pt-4 border-t text-xs text-slate-500">
                  <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary-500" /> {new Date(drv.startDate).toLocaleDateString()} - {new Date(drv.endDate).toLocaleDateString()}</p>
                  <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-500" /> {drv.locationName}, {drv.city}</p>
                  <p className="flex items-center gap-2"><Hospital className="w-4 h-4 text-emerald-500" /> Organized: {drv.organizer?.fullName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400 space-y-2">
          <Hospital className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-sm font-semibold">No active drives match these location filters.</p>
        </div>
      )}
    </div>
  );
};

export default CampaignHub;
