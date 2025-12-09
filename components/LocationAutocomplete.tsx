"use client";

import { useState, useEffect, useRef } from 'react';

interface Suggestion {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LocationAutocomplete({ value, onChange, placeholder }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    timer.current = window.setTimeout(() => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(
        query,
      )}`;

      fetch(url)
        .then((res) => res.json())
        .then((data: Suggestion[]) => {
          setSuggestions(data || []);
          setOpen(true);
        })
        .catch(() => {
          setSuggestions([]);
          setOpen(false);
        });
    }, 300);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function selectSuggestion(s: Suggestion) {
    // Prefer concise label: city/town/village + state + country when available
    const addr = s.address || {};
    const place = addr.city || addr.town || addr.village || addr.state || s.display_name.split(',')[0];
    const country = addr.country || '';
    const label = country ? `${place}, ${country}` : s.display_name;
    setQuery(label);
    onChange(label);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        className="w-full rounded-md border px-3 py-2"
        placeholder={placeholder || 'City, Country'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-md max-h-60 overflow-auto">
          {suggestions.map((s) => {
            const cc = s.address?.country_code ? s.address.country_code.toLowerCase() : null;
            const flagUrl = cc ? `https://flagcdn.com/w20/${cc}.png` : null;
            const title = s.display_name;
            return (
              <li
                key={s.place_id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/60 cursor-pointer"
                onMouseDown={(e) => {
                  // use onMouseDown so click doesn't blur input before handler
                  e.preventDefault();
                  selectSuggestion(s);
                }}
              >
                {flagUrl ? (
                  <img src={flagUrl} alt="flag" className="w-5 h-4 rounded-sm object-cover" />
                ) : (
                  <div className="w-5 h-4" />
                )}
                <div className="text-sm truncate">{title}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
