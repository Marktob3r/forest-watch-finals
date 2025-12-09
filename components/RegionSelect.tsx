"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { Input } from "./ui/input";

interface RegionSelectProps {
  country: string;
  value: string;
  onChange: (val: string) => void;
  id?: string;
  className?: string;
}

const STATIC_REGIONS: Record<string, string[]> = {
  "United States": [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
  ],
  "Philippines": [
    "Abra","Agusan del Norte","Agusan del Sur","Aklan","Albay","Antique","Apayao","Aurora","Basilan","Bataan","Batanes","Batangas","Benguet","Biliran","Bohol","Bukidnon","Bulacan","Cagayan","Camarines Norte","Camarines Sur","Camiguin","Capiz","Catanduanes","Cavite","Cebu","Cotabato","Davao de Oro","Davao del Norte","Davao del Sur","Davao Occidental","Davao Oriental","Dinagat Islands","Eastern Samar","Guimaras","Ifugao","Ilocos Norte","Ilocos Sur","Iloilo","Isabela","Kalinga","La Union","Laguna","Lanao del Norte","Lanao del Sur","Leyte","Maguindanao","Marinduque","Masbate","Misamis Occidental","Misamis Oriental","Mountain Province","Negros Occidental","Negros Oriental","Northern Samar","Nueva Ecija","Nueva Vizcaya","Occidental Mindoro","Oriental Mindoro","Palawan","Pampanga","Pangasinan","Quezon","Quirino","Rizal","Romblon","Samar","Sarangani","Siquijor","Sorsogon","South Cotabato","Southern Leyte","Sultan Kudarat","Sulu","Surigao del Norte","Surigao del Sur","Tarlac","Tawi-Tawi","Zambales","Zamboanga del Norte","Zamboanga del Sur","Zamboanga Sibugay"
  ],
  "Brazil": ["Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal","Espírito Santo","Goiás","Maranhão","Mato Grosso","Mato Grosso do Sul","Minas Gerais","Pará","Paraíba","Paraná","Pernambuco","Piauí","Rio de Janeiro","Rio Grande do Norte","Rio Grande do Sul","Rondônia","Roraima","Santa Catarina","São Paulo","Sergipe","Tocantins"],
  "Nigeria": ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","FCT"],
};

function uniqueSorted(arr: string[]) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

export default function RegionSelect({
  country,
  value,
  onChange,
  id,
  className,
}: RegionSelectProps) {
  const [options, setOptions] = useState<string[] | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let mounted = true;
    setFilter("");
    if (!country) {
      setOptions(null);
      return;
    }

    const staticList = STATIC_REGIONS[country];
    if (staticList) {
      setOptions(staticList);
      return;
    }

    // Fetch regions using Nominatim: derive a list of states/regions from search results
    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search.php?country=${encodeURIComponent(
          country,
        )}&format=jsonv2&addressdetails=1&limit=200`;
        const resp = await fetch(url, { headers: { "User-Agent": "forest-watch-app" } });
        const json = await resp.json();
        const candidates: string[] = [];
        if (Array.isArray(json)) {
          for (const item of json) {
            const addr = item.address || {};
            const names = [addr.state, addr.region, addr.county, addr.province, addr.state_district];
            for (const n of names) {
              if (n && typeof n === "string") candidates.push(n);
            }
          }
        }
        const unique = uniqueSorted(candidates);
        if (mounted) setOptions(unique.length > 0 ? unique : []);
      } catch (err) {
        // on failure, set empty list to fall back to free input
        if (mounted) setOptions([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [country]);

  const filtered = useMemo(() => {
    if (!options) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((s) => s.toLowerCase().includes(q));
  }, [options, filter]);

  // If no options discovered, render a free text Input so user can type region
  if (options === null) {
    // still loading
    return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className} placeholder="Loading regions..." />;
  }

  if (options.length === 0) {
    return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className} placeholder="Type region/state" />;
  }

  return (
    <div className={className}>
      <Select value={value} onValueChange={(val) => onChange(val)}>
        <SelectTrigger id={id}>
          <SelectValue>{value || <span className="text-muted-foreground">Select a region/state</span>}</SelectValue>
        </SelectTrigger>

        <SelectContent>
          <div className="px-2 pb-2">
            <input
              aria-label="Search regions"
              className="w-full px-2 py-2 rounded-md border border-border bg-input-background text-sm mb-2 outline-none"
              placeholder="Search region or type..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {filtered.map((r) => (
            <SelectItem key={r} value={r}>
              <div className="flex items-center justify-between">
                <span className="truncate">{r}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
