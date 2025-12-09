"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MapPin, Layers, Satellite, Thermometer, Droplets, Wind, Leaf, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// Mock environmental data
const temperatureData = [
  { time: '00:00', value: 22 },
  { time: '04:00', value: 20 },
  { time: '08:00', value: 24 },
  { time: '12:00', value: 28 },
  { time: '16:00', value: 30 },
  { time: '20:00', value: 26 },
];

const humidityData = [
  { time: '00:00', value: 78 },
  { time: '04:00', value: 82 },
  { time: '08:00', value: 75 },
  { time: '12:00', value: 65 },
  { time: '16:00', value: 60 },
  { time: '20:00', value: 70 },
];

const vegetationHealthData = [
  { date: '1 Jan', ndvi: 0.72 },
  { date: '8 Jan', ndvi: 0.74 },
  { date: '15 Jan', ndvi: 0.71 },
  { date: '22 Jan', ndvi: 0.69 },
  { date: '29 Jan', ndvi: 0.68 },
];

const monitoringRegions = [
  { id: 1, name: 'Amazon Basin North', country: 'Brazil', lat: '-3.4653', lng: '-62.2159', status: 'critical', coverage: 45.2 },
  { id: 2, name: 'Congo Rainforest', country: 'DRC', lat: '0.0000', lng: '25.0000', status: 'warning', coverage: 78.5 },
  { id: 3, name: 'Borneo Highlands', country: 'Malaysia', lat: '1.5535', lng: '110.3593', status: 'healthy', coverage: 82.1 },
  { id: 4, name: 'Sumatra Forest Reserve', country: 'Indonesia', lat: '-0.5897', lng: '101.3431', status: 'healthy', coverage: 88.7 },
];

export function Monitor() {
  const [regions, setRegions] = useState<any[]>(monitoringRegions);
  const [selectedRegion, setSelectedRegion] = useState<any>(regions[0]);
  const [mapLayer, setMapLayer] = useState('satellite');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [leafletError, setLeafletError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const tileLayerRef = useRef<any | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const initAttemptsRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  // live data state per region (15-minute rolling window)
  const HISTORY_MINUTES = 15;
  // how many minutes between samples (user requested a 15-minute interval)
  const SAMPLE_INTERVAL_MINUTES = 15;
  const SAMPLE_INTERVAL_MS = SAMPLE_INTERVAL_MINUTES * 60 * 1000;
  // Visual window: show the last 6 samples (90 minutes) while still sampling every 15 minutes
  const VISUAL_WINDOW_MINUTES = 90;
  const VISUAL_SAMPLES = Math.max(1, Math.ceil(VISUAL_WINDOW_MINUTES / SAMPLE_INTERVAL_MINUTES));
  // Vegetation NDVI should be daily samples (show last NDVI_DAYS days)
  const NDVI_DAYS = 7;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const [liveData, setLiveData] = useState<Record<number, any>>(() => ({}));
  const liveIntervalRef = useRef<number | null>(null);
  const lastIntervalRef = useRef<number>(Math.floor(Date.now() / SAMPLE_INTERVAL_MS));
  const lastNdviDayRef = useRef<number>(Math.floor(Date.now() / DAY_MS));

  // Fetch real-time weather (temperature + humidity) from Open-Meteo for each region
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fetchRegion = async (r: any) => {
      try {
        const lat = parseFloat(r.lat);
        const lon = parseFloat(r.lng);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=UTC`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        const temp = json?.current_weather?.temperature ?? null;
        // pick the latest humidity hourly value if present
        let hum = null;
        if (json?.hourly && Array.isArray(json.hourly.time) && Array.isArray(json.hourly.relativehumidity_2m)) {
          const times = json.hourly.time;
          const hums = json.hourly.relativehumidity_2m;
          if (times.length && hums.length && times.length === hums.length) {
            hum = hums[hums.length - 1];
          }
        }

        // simple NDVI seed based on latitude to create region differences
        const latSeed = Math.abs(lat % 10) / 10; // 0..1
        const ndviSeed = 0.55 + (latSeed - 0.5) * 0.1; // vary slightly around 0.55

        setLiveData((prev) => {
          const copy = { ...prev };
          const entry = copy[r.id] ? { ...copy[r.id] } : {};
          const baseTemp = temp ?? (temperatureData[temperatureData.length - 1].value);
          const baseHum = hum ?? (humidityData[humidityData.length - 1].value);
          const baseNdvi = Math.max(-1, Math.min(1, ndviSeed));

          const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          const labels = Array.from({ length: VISUAL_SAMPLES }, (_, i) => fmt(new Date(Date.now() - (VISUAL_SAMPLES - 1 - i) * SAMPLE_INTERVAL_MS)));

          entry.temperatureHistory = Array.from({ length: VISUAL_SAMPLES }, () => baseTemp);
          entry.temperatureLabels = labels;
          entry.humidityHistory = Array.from({ length: VISUAL_SAMPLES }, () => baseHum);
          entry.humidityLabels = labels;
          entry.ndviHistory = Array.from({ length: NDVI_DAYS }, () => baseNdvi);
          // daily labels for NDVI
          entry.ndviLabels = Array.from({ length: NDVI_DAYS }, (_, i) => new Date(Date.now() - (NDVI_DAYS - 1 - i) * DAY_MS).toLocaleDateString());
          entry.soil = { ...(entry.soil || {}), temperature: baseTemp };

          copy[r.id] = entry;
          return copy;
        });
      } catch (err) {
        // keep existing simulated values on failure
        console.warn('Open-Meteo fetch failed for region', r.name, err);
      }
    };

    // fetch for dynamic regions (populated from projects)
    (regions || []).forEach((r) => fetchRegion(r));
    // Also attempt to load projects from API to replace the static regions list
    (async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) return;
        const json = await res.json();
        const projects = json?.projects || [];
        if (projects.length === 0) return;
        // map up to 5 projects into regions with numeric ids (1..n)
        const mapped = projects.slice(0, 5).map((p: any, idx: number) => {
          // coordinates may be stored as "lat, lng" or null
          let lat = '0.0', lng = '0.0';
          if (p.coordinates && typeof p.coordinates === 'string') {
            const parts = p.coordinates.split(',').map((s: string) => s.trim());
            if (parts.length >= 2) {
              lat = parts[0];
              lng = parts[1];
            }
          }
          return {
            id: idx + 1,
            projectId: p.id,
            name: p.name,
            country: p.country || '',
            lat: lat,
            lng: lng,
            status: 'healthy',
            coverage: Math.round((Math.random() * 30) + 60 * (1 - (idx / 10)))
          };
        });
        setRegions(mapped);
      } catch (e) {
        // ignore failures and keep static regions
      }
    })();
  }, []);

  // Keep Leaflet markers in sync when `regions` changes to avoid duplicate pins
  useEffect(() => {
    const L = (window as any).L;
    const map = leafletMapRef.current;
    if (!map || !L) return;

    try {
      // remove existing markers
      if (markersRef.current && markersRef.current.length) {
        markersRef.current.forEach((m) => {
          try { map.removeLayer(m); } catch (e) {}
        });
      }
      markersRef.current = [];

      const LABEL_ZOOM = 7;
      const getPinClass = (status: string) => status === 'critical' ? 'fw-pin--red' : status === 'warning' ? 'fw-pin--orange' : 'fw-pin--green';

      (regions || []).forEach((r) => {
        try {
          if (!r || !r.lat || !r.lng) return;
          const lat = parseFloat(String(r.lat));
          const lng = parseFloat(String(r.lng));
          if (Number.isNaN(lat) || Number.isNaN(lng)) return;
          const colorClass = getPinClass(r.status || 'healthy');
          const iconHtml = `<span class="fw-pin ${colorClass}"></span>`;
          const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [18, 26], iconAnchor: [9, 26] });
          const marker = L.marker([lat, lng], { icon }).addTo(map);
          (marker as any).__regionId = r.id;
          marker.bindTooltip(r.name || '', { permanent: false, direction: 'bottom', className: 'region-tooltip' });
          marker.on('click', () => {
            try { setSelectedRegion(r); } catch (e) {}
          });
          markersRef.current.push(marker);
        } catch (e) {
          // ignore marker creation errors for individual regions
        }
      });

      // toggle tooltips based on current zoom
      try {
        const z = map.getZoom();
        markersRef.current.forEach((m) => {
          try {
            if (z >= LABEL_ZOOM) m.openTooltip(); else m.closeTooltip();
          } catch (e) {}
        });
      } catch (e) {}
    } catch (e) {}
  }, [regions, reloadKey, leafletLoaded]);

  // Populate liveData for regions when regions list changes
  useEffect(() => {
    if (!regions || regions.length === 0) return;
    setLiveData((prev) => {
      const copy: Record<number, any> = { ...prev };
      const now = Date.now();
      const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const minuteTimes = Array.from({ length: VISUAL_SAMPLES }, (_, i) => new Date(now - (VISUAL_SAMPLES - 1 - i) * SAMPLE_INTERVAL_MS));
      regions.forEach((r) => {
        const id = r.id;
        if (copy[id]) return; // already present
        const baseTemp = temperatureData[temperatureData.length - 1].value;
        const baseHum = humidityData[humidityData.length - 1].value;
        const baseNdvi = vegetationHealthData[vegetationHealthData.length - 1].ndvi;
        const ndviTimes = Array.from({ length: NDVI_DAYS }, (_, i) => new Date(Date.now() - (NDVI_DAYS - 1 - i) * DAY_MS));
        copy[id] = {
          temperatureHistory: Array.from({ length: VISUAL_SAMPLES }, () => baseTemp),
          temperatureLabels: minuteTimes.map(fmt),
          humidityHistory: Array.from({ length: VISUAL_SAMPLES }, () => baseHum),
          humidityLabels: minuteTimes.map(fmt),
          ndviHistory: Array.from({ length: NDVI_DAYS }, () => baseNdvi),
          ndviLabels: ndviTimes.map((d) => d.toLocaleDateString()),
          soil: {
            moisture: 68,
            pH: 6.5,
            organic: 4.2,
            nitrogen: 45,
            phosphorus: 22,
            potassium: 156,
            temperature: 24,
          }
        };
      });
      return copy;
    });
    // set a sensible selected region if none chosen or old selection not in regions
    setSelectedRegion((cur: any) => {
      if (cur && regions.find((r) => r.id === cur.id)) return cur;
      return regions[0];
    });
  }, [regions]);

  // If a projectId query param is present, select that region once regions are available
  const searchParams = useSearchParams();
  useEffect(() => {
    try {
      const projectId = searchParams?.get ? searchParams.get('projectId') : null;
      if (!projectId) return;
      if (!regions || regions.length === 0) return;
      const found = regions.find((r) => String(r.projectId || r.id) === String(projectId));
      if (found) setSelectedRegion(found);
    } catch (e) {}
  }, [searchParams, regions]);

  // Daily NDVI updater: run hourly and append a new daily NDVI when the day advances
  useEffect(() => {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const tick = () => {
      try {
        const nowDay = Math.floor(Date.now() / DAY_MS);
        if (nowDay !== lastNdviDayRef.current) {
          lastNdviDayRef.current = nowDay;
          setLiveData((prev) => {
            const copy: Record<number, any> = { ...prev };
            Object.keys(copy).forEach((key) => {
              const id = Number(key);
              const entry = { ...copy[id] };
              const lastNdvi = entry.ndviHistory[entry.ndviHistory.length - 1];
              const ndvi = clamp(lastNdvi + (Math.random() - 0.5) * 0.02, -1, 1);
              entry.ndviHistory = [...entry.ndviHistory.slice(- (NDVI_DAYS - 1)), ndvi];
              entry.ndviLabels = [...entry.ndviLabels.slice(- (NDVI_DAYS - 1)), new Date().toLocaleDateString()];
              copy[id] = entry;
            });
            return copy;
          });
        }
      } catch (e) {}
    };

    // check hourly for day change
    const id = window.setInterval(tick, 60 * 60 * 1000);
    // immediate check
    tick();
    return () => window.clearInterval(id);
  }, []);

  // Helper to load Leaflet CSS/JS from CDN only on client
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeaflet = async () => {
      if ((window as any).L) {
        // ensure CSS is present even if script was injected earlier
        if (!document.querySelector('link[data-leaflet]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.setAttribute('data-leaflet', '1');
          document.head.appendChild(link);
        }
        return (window as any).L;
      }

      // CSS
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet', '1');
        document.head.appendChild(link);
      }

      // Script
      if (!document.querySelector('script[data-leaflet]')) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.setAttribute('data-leaflet', '1');
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load Leaflet'));
          document.body.appendChild(s);
        });
      }

      return (window as any).L;
    };

      let mounted = true;
      setLeafletError(null);
      setLeafletLoaded(false);
    loadLeaflet()
      .then((L) => {
        if (!mounted) return;
        if (!mapContainerRef.current) return;

        if (!leafletMapRef.current) {
          if (L && L.Icon && L.Icon.Default) {
            L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
          }

          // guard: avoid initializing map when container has no layout (0x0), retry shortly
          try {
            const rect = mapContainerRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              initAttemptsRef.current = (initAttemptsRef.current || 0) + 1;
              if (initAttemptsRef.current <= 6) {
                const delay = 200 * initAttemptsRef.current;
                if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = window.setTimeout(() => setReloadKey((k) => k + 1), delay);
              } else {
                setLeafletError('Map container not laid out');
              }
              return;
            }
          } catch (e) {}

          const center = [parseFloat(selectedRegion.lat), parseFloat(selectedRegion.lng)];
          let map;
          try {
            map = L.map(mapContainerRef.current, { center, zoom: 5, zoomControl: false, attributionControl: false });
          } catch (err) {
            console.warn('Leaflet map construction failed, scheduling retry', err);
            initAttemptsRef.current = (initAttemptsRef.current || 0) + 1;
            if (initAttemptsRef.current <= 6) {
              const delay = 300 * initAttemptsRef.current;
              if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = window.setTimeout(() => setReloadKey((k) => k + 1), delay);
            } else {
              setLeafletError(String((err as Error)?.message || err));
            }
            return;
          }
          leafletMapRef.current = map;

          const getTile = (layerName: string) => {
            if (layerName === 'satellite') {
              return {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: 'Tiles © Esri'
              };
            }
            return {
              url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              attribution: '&copy; OpenStreetMap contributors'
            };
          };

          const tile = getTile(mapLayer);
          tileLayerRef.current = L.tileLayer(tile.url, { attribution: tile.attribution });
          tileLayerRef.current.addTo(map);

          markersRef.current = [];
          // inject simple pin CSS once so divIcons render nicely
          if (!document.querySelector('style[data-fw-pin]')) {
            const style = document.createElement('style');
            style.setAttribute('data-fw-pin', '1');
            style.innerHTML = `
              .fw-pin { display:block; width:18px; height:18px; border-radius:50%; position:relative; box-shadow:0 0 0 2px rgba(255,255,255,0.95); }
              .fw-pin::after { content:''; position:absolute; left:50%; top:100%; transform:translateX(-50%); width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid #000; }
              .fw-pin--red { background:#ef4444; }
              .fw-pin--red::after { border-top-color: #ef4444; }
              .fw-pin--orange { background:#f59e0b; }
              .fw-pin--orange::after { border-top-color: #f59e0b; }
              .fw-pin--green { background:#10b981; }
              .fw-pin--green::after { border-top-color: #10b981; }
              .region-tooltip { background: rgba(255,255,255,0.95); color: #08101a; padding:4px 8px; border-radius:6px; box-shadow:0 1px 4px rgba(0,0,0,0.12); }
            `;
            document.head.appendChild(style);
          }

          const LABEL_ZOOM = 7;
          const getPinClass = (status: string) => status === 'critical' ? 'fw-pin--red' : status === 'warning' ? 'fw-pin--orange' : 'fw-pin--green';

          (regions || []).forEach((r) => {
            const colorClass = getPinClass(r.status);
            const iconHtml = `<span class="fw-pin ${colorClass}"></span>`;
            // iconSize includes the triangular tip (18 + 8)
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [18, 26], iconAnchor: [9, 26] });
            const marker = L.marker([parseFloat(r.lat), parseFloat(r.lng)], { icon }).addTo(map);
            (marker as any).__regionId = r.id;
            // tooltip appears toward bottom when zoomed in
            marker.bindTooltip(r.name, { permanent: false, direction: 'bottom', className: 'region-tooltip' });
            marker.on('click', () => {
              setSelectedRegion(r);
            });
            markersRef.current.push(marker);
          });

          // toggle tooltips based on zoom level
          const handleZoom = () => {
            try {
              const z = map.getZoom();
              markersRef.current.forEach((m) => {
                try {
                  if (z >= LABEL_ZOOM) m.openTooltip(); else m.closeTooltip();
                } catch (e) {}
              });
            } catch (e) {}
          };
          map.on('zoomend', handleZoom);
          // initial state
          try { handleZoom(); } catch (e) {}
          // store handler for cleanup
          (map as any).__fw_handleZoom = handleZoom;

          // Ensure Leaflet recalculates size when the container is visible or resized.
          // Some browsers/layouts may initialize the map while its container is not yet laid out,
          // causing tiles to not render until a subsequent resize or tab switch.
          try {
            // small timeout to allow layout to settle
            setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 200);

            // ResizeObserver: call invalidateSize on container size changes
            if (mapContainerRef.current && 'ResizeObserver' in window) {
              resizeObserverRef.current = new ResizeObserver(() => {
                try { map.invalidateSize(); } catch (e) {}
              });
              resizeObserverRef.current.observe(mapContainerRef.current);
            }

            // IntersectionObserver: when the map becomes visible (e.g., after tab switch), invalidate
            if (mapContainerRef.current && 'IntersectionObserver' in window) {
              intersectionObserverRef.current = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                    try { map.invalidateSize(); } catch (e) {}
                  }
                });
              }, { threshold: 0.1 });
              intersectionObserverRef.current.observe(mapContainerRef.current);
            }
          } catch (e) {}

          setLeafletLoaded(true);
          setLeafletError(null);
        }
      })
        .catch((err) => {
          console.warn('Leaflet load failed', err);
          setLeafletError(err?.message || String(err));
          setLeafletLoaded(false);
        });

      return () => {
        mounted = false;
        try {
          if (leafletMapRef.current) {
            try { leafletMapRef.current.remove(); } catch (e) {}
            leafletMapRef.current = null;
          }
          try {
            if (resizeObserverRef.current && mapContainerRef.current) {
              resizeObserverRef.current.unobserve(mapContainerRef.current);
            }
            if (resizeObserverRef.current) {
              resizeObserverRef.current.disconnect();
              resizeObserverRef.current = null;
            }
          } catch (e) {}
          try {
            if (intersectionObserverRef.current && mapContainerRef.current) {
              intersectionObserverRef.current.unobserve(mapContainerRef.current);
            }
            if (intersectionObserverRef.current) {
              intersectionObserverRef.current.disconnect();
              intersectionObserverRef.current = null;
            }
          } catch (e) {}
          try {
            if (retryTimeoutRef.current) {
              window.clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
          } catch (e) {}
        } catch (e) {}
      };
  }, [reloadKey]);

  // Debug helper: force-inject leaflet resources and trigger reload
  const forceInjectLeaflet = () => {
    try {
      const s = document.querySelector('script[data-leaflet]');
      const l = document.querySelector('link[data-leaflet]');
      if (s) s.remove();
      if (l) l.remove();

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet', '1');
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.setAttribute('data-leaflet', '1');
      script.onload = () => { setReloadKey((k) => k + 1); };
      script.onerror = (ev) => { setLeafletError('Script load error'); };
      document.body.appendChild(script);
    } catch (e: any) {
      setLeafletError(String(e?.message || e));
    }
  };

  // start a simulated realtime update loop for liveData — append once per SAMPLE_INTERVAL_MINUTES, keep a HISTORY_MINUTES window
  useEffect(() => {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const pushIntervalSample = () => {
      const now = Date.now();
      const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const dateLabel = new Date().toLocaleDateString();
      setLiveData((prev) => {
        const copy: Record<number, any> = { ...prev };
        Object.keys(copy).forEach((key) => {
          const id = Number(key);
          const entry = { ...copy[id] };
          // temperature: last value +/- small random
          const lastTemp = entry.temperatureHistory[entry.temperatureHistory.length - 1];
          const temp = clamp(lastTemp + (Math.random() - 0.5) * 1.5, -10, 45);
          entry.temperatureHistory = [...entry.temperatureHistory.slice(- (VISUAL_SAMPLES - 1)), temp];
          entry.temperatureLabels = [...entry.temperatureLabels.slice(- (VISUAL_SAMPLES - 1)), fmtTime(new Date(now))];

          // humidity
          const lastHum = entry.humidityHistory[entry.humidityHistory.length - 1];
          const hum = clamp(lastHum + (Math.random() - 0.5) * 3, 0, 100);
          entry.humidityHistory = [...entry.humidityHistory.slice(- (VISUAL_SAMPLES - 1)), hum];
          entry.humidityLabels = [...entry.humidityLabels.slice(- (VISUAL_SAMPLES - 1)), fmtTime(new Date(now))];

            // NDVI is updated daily (not on the 15-minute interval). See daily updater effect.

          // soil
          entry.soil = { ...entry.soil };
          entry.soil.moisture = clamp(entry.soil.moisture + (Math.random() - 0.5) * 1.5, 0, 100);
          entry.soil.temperature = clamp(entry.soil.temperature + (Math.random() - 0.5) * 0.8, -10, 45);

          copy[id] = entry;
        });
        return copy;
      });
    };

    // run every 5 seconds but only push a new sample when the configured interval bucket advances
    liveIntervalRef.current = window.setInterval(() => {
      try {
        const nowInterval = Math.floor(Date.now() / SAMPLE_INTERVAL_MS);
        if (nowInterval !== lastIntervalRef.current) {
          lastIntervalRef.current = nowInterval;
          pushIntervalSample();
        }
      } catch (e) {}
    }, 5000);

    return () => {
      if (liveIntervalRef.current) window.clearInterval(liveIntervalRef.current);
    };
  }, []);

  // react to selectedRegion or mapLayer changes
  useEffect(() => {
    const L = (window as any).L;
    const map = leafletMapRef.current;
    if (!map || !L) return;

    // center map on selected region
    try {
      const lat = parseFloat(selectedRegion.lat);
      const lng = parseFloat(selectedRegion.lng);
      map.setView([lat, lng], Math.max(map.getZoom(), 5));
    } catch (e) {}

    // open popup / tooltip for selected marker when region changes
    try {
      const matched = markersRef.current.find((m) => (m as any).__regionId === selectedRegion.id);
      if (matched) {
        try { if (map.getZoom() >= 7) matched.openTooltip(); else matched.closeTooltip(); } catch (e) {}
      }
    } catch (e) {}

    // update tile layer if changed
    if (tileLayerRef.current) {
      const newUrl = mapLayer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      try {
        if (typeof tileLayerRef.current.setUrl === 'function') {
          tileLayerRef.current.setUrl(newUrl);
        } else {
          // replace tile layer
          tileLayerRef.current.remove();
          const Ltile = L.tileLayer(newUrl, { attribution: mapLayer === 'satellite' ? 'Tiles © Esri' : '&copy; OpenStreetMap contributors' });
          Ltile.addTo(map);
          tileLayerRef.current = Ltile;
        }
      } catch (e) {
        // ignore
      }
    }
      // sometimes Leaflet needs an explicit resize when layout changes
      try { setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 200); } catch (e) {}
  }, [selectedRegion, mapLayer]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-primary mb-2">Forest Monitoring</h1>
          <p className="text-muted-foreground">Satellite imagery with real-time data</p>
        </div>
      </div>

      {/* Map and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <Card className="p-0 lg:col-span-3 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3>{selectedRegion.name}</h3>
            </div>
            <div className="flex items-center gap-2 max-[720px]:flex-col max-[720px]:items-stretch">
              <Button
                variant={mapLayer === 'satellite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapLayer('satellite')}
                className="max-[720px]:w-full"
              >
                <Satellite className="w-4 h-4 mr-2" />
                Satellite
              </Button>
              <Button
                variant={mapLayer === 'terrain' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapLayer('terrain')}
                className="max-[720px]:w-full"
              >
                <Layers className="w-4 h-4 mr-2" />
                Terrain
              </Button>
            </div>
          </div>
          
          {/* Interactive Leaflet map loaded dynamically from CDN (no npm dependency) */}
          <div className="relative h-[400px] bg-muted">
            <div ref={mapContainerRef as any} className="absolute inset-0 z-0" id="leaflet-map" />

              {/* show an overlay if loading failed, with retry */}
              {leafletError && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto">
                  <div className="bg-card/95 backdrop-blur-sm px-4 py-3 rounded-lg border border-border text-center">
                    <p className="text-sm text-destructive mb-2">Map failed to load</p>
                    <p className="text-xs text-muted-foreground mb-3">{leafletError}</p>
                    <div className="flex items-center justify-center">
                      <Button size="sm" onClick={() => {
                        // remove existing script/link so the loader will re-add them
                        const s = document.querySelector('script[data-leaflet]');
                        const l = document.querySelector('link[data-leaflet]');
                        if (s) s.remove();
                        if (l) l.remove();
                        setReloadKey((k) => k + 1);
                        setLeafletError(null);
                      }}>
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Overlay indicators (kept in DOM so they float above the map) */}

            {/* Overlay indicators (kept in DOM so they float above the map) */}
            <div className="absolute top-4 left-4 space-y-2 pointer-events-none z-2">
              <div className="bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Forest Coverage</p>
                <p className="text-primary">{selectedRegion.coverage}%</p>
              </div>
            </div>

            {/* Legend */}
            {/* <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-border pointer-events-none z-50">
              <p className="text-xs mb-2">Legend</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Healthy</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-orange-500 rounded" />
                  <span>Warning</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span>Critical</span>
                </div>
              </div>
            </div> */}
          </div>
        </Card>

        {/* Region List */}
        <Card className="p-4">
          <h3 className="mb-4">Monitored Regions</h3>
          <div className="space-y-2">
            {(regions || monitoringRegions).map((region) => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedRegion.id === region.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm">{region.name}</h4>
                  <div className={`w-2 h-2 rounded-full mt-1 ${
                    region.status === 'critical' ? 'bg-destructive' :
                    region.status === 'warning' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`} />
                </div>
                <p className="text-xs text-muted-foreground mb-2">{region.country}</p>
                <div className="text-xs">
                  <span className="text-muted-foreground">Coverage: </span>
                  <span className="text-primary">{region.coverage}%</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Environmental Data */}
      <Card className="p-6">
        <h3 className="mb-4">Environmental Data - {selectedRegion.name}</h3>
        <Tabs defaultValue="temperature">
          <TabsList className="mb-6 flex flex-wrap gap-2">
              <TabsTrigger value="temperature" className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md">
                <Thermometer className="w-4 h-4 max-[680px]:w-6 max-[680px]:h-6" aria-hidden />
                <span className="max-[680px]:hidden">Temperature</span>
                <span className="sr-only">Temperature</span>
              </TabsTrigger>
              <TabsTrigger value="humidity" className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md">
                <Droplets className="w-4 h-4 max-[680px]:w-6 max-[680px]:h-6" aria-hidden />
                <span className="max-[680px]:hidden">Humidity</span>
                <span className="sr-only">Humidity</span>
              </TabsTrigger>
              <TabsTrigger value="vegetation" className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md">
                <Leaf className="w-4 h-4 max-[680px]:w-6 max-[680px]:h-6" aria-hidden />
                <span className="max-[680px]:hidden">Vegetation Health</span>
                <span className="sr-only">Vegetation Health</span>
              </TabsTrigger>
              <TabsTrigger value="soil" className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md">
                <Wind className="w-4 h-4 max-[680px]:w-6 max-[680px]:h-6" aria-hidden />
                <span className="max-[680px]:hidden">Soil Quality</span>
                <span className="sr-only">Soil Quality</span>
              </TabsTrigger>
            </TabsList>

          <TabsContent value="temperature">
            <div className="space-y-4">
              {(() => {
                const rd = liveData[selectedRegion.id] || null;
                const temps = rd ? rd.temperatureHistory : temperatureData.map((d) => d.value);
                const labels = rd ? rd.temperatureLabels : temperatureData.map((d) => d.time);
                const current = temps[temps.length - 1];
                const min = Math.min(...temps);
                const max = Math.max(...temps);
                const chartData = temps.map((v: number, i: number) => ({ time: labels[i] || String(i), value: Number(v.toFixed(1)) }));
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Current</p>
                        <p className="text-2xl text-primary">{Math.round(current)}°C</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Min (24h)</p>
                        <p className="text-2xl">{Math.round(min)}°C</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Max (24h)</p>
                        <p className="text-2xl">{Math.round(max)}°C</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value: number) => `${value}°C`}
                        />
                        <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="humidity">
            <div className="space-y-4">
              {(() => {
                const rd = liveData[selectedRegion.id] || null;
                const hums = rd ? rd.humidityHistory : humidityData.map((d) => d.value);
                const labels = rd ? rd.humidityLabels : humidityData.map((d) => d.time);
                const current = hums[hums.length - 1];
                const min = Math.min(...hums);
                const max = Math.max(...hums);
                const chartData = hums.map((v: number, i: number) => ({ time: labels[i] || String(i), value: Number(v.toFixed(1)) }));
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Current</p>
                        <p className="text-2xl text-primary">{Math.round(current)}%</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Min (24h)</p>
                        <p className="text-2xl">{Math.round(min)}%</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Max (24h)</p>
                        <p className="text-2xl">{Math.round(max)}%</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          formatter={(value: number) => `${value}%`}
                        />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHumidity)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="vegetation">
            <div className="space-y-4">
              {(() => {
                const rd = liveData[selectedRegion.id] || null;
                const ndvis = rd ? rd.ndviHistory : vegetationHealthData.map((d) => d.ndvi);
                const labels = rd ? rd.ndviLabels : vegetationHealthData.map((d) => d.date);
                const current = ndvis[ndvis.length - 1];
                const trend = (((current - ndvis[0]) / Math.abs(ndvis[0] || 1)) * 100).toFixed(1);
                const chartData = ndvis.map((v: number, i: number) => ({ date: labels[i] || String(i), ndvi: Number(v.toFixed(3)) }));
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Current NDVI</p>
                        <p className="text-2xl text-primary">{current.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Health Status</p>
                        <p className="text-2xl">{current > 0.7 ? 'Good' : current > 0.5 ? 'Fair' : 'Poor'}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Trend</p>
                        <p className="text-2xl text-orange-500">{trend}%</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" domain={[Math.min(...ndvis) - 0.05, Math.max(...ndvis) + 0.05]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Line type="monotone" dataKey="ndvi" stroke="#22c55e" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground">
                      NDVI (Normalized Difference Vegetation Index) measures vegetation health. Values range from -1 to 1, 
                      with higher values indicating healthier vegetation.
                    </p>
                  </>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="soil">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const rd = liveData[selectedRegion.id] || null;
                  const soil = rd ? rd.soil : { moisture: 68, pH: 6.5, organic: 4.2 };
                  return (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Moisture</p>
                        <p className="text-2xl text-primary">{Math.round(soil.moisture)}%</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">pH Level</p>
                        <p className="text-2xl">{soil.pH.toFixed(1)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Organic Matter</p>
                        <p className="text-2xl">{soil.organic.toFixed(1)}%</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {(() => {
                  const rd = liveData[selectedRegion.id] || null;
                  const soil = rd ? rd.soil : { nitrogen: 45, phosphorus: 22, potassium: 156, temperature: 24 };
                  return (
                    <>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm mb-2">Nitrogen (N)</p>
                        <p className="text-muted-foreground">{Math.round(soil.nitrogen)} ppm</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm mb-2">Phosphorus (P)</p>
                        <p className="text-muted-foreground">{Math.round(soil.phosphorus)} ppm</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm mb-2">Potassium (K)</p>
                        <p className="text-muted-foreground">{Math.round(soil.potassium)} ppm</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm mb-2">Temperature</p>
                        <p className="text-muted-foreground">{Math.round(soil.temperature)}°C</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
