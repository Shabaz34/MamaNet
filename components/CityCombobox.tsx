'use client';

import { useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { ISRAELI_CITIES } from '@/lib/israeliCities';

// Text input that filters the Israeli cities list as you type (e.g. typing
// "הרצ" surfaces "הרצליה") and lets you click a match to select it.
export default function CityCombobox({
  value,
  onChange,
  placeholder = 'התחילי להקליד שם עיר...',
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();

  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return ISRAELI_CITIES.slice(0, 8);
    return ISRAELI_CITIES.filter((city) => city.includes(trimmed)).slice(0, 8);
  }, [query]);

  function selectCity(city: string) {
    setQuery(city);
    onChange(city);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          required
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so a click on a suggestion registers before the list unmounts.
            blurTimeout.current = setTimeout(() => setOpen(false), 150);
          }}
          className="w-full rounded-xl border border-slate-200 pr-10 pl-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:border-[#003366]/50 focus:ring-2 focus:ring-[#003366]/20"
        />
      </div>

      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1.5 w-full max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1.5">
          {matches.map((city) => (
            <li key={city}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(city)}
                className="w-full text-right px-4 py-2.5 text-[15px] text-slate-700 hover:bg-slate-50 transition"
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
