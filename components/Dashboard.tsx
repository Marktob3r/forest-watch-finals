import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, Trees, Leaf, Droplets, Wind } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useEffect, useState } from 'react';

// Data is fetched from `/api/dashboard`. If the API is not present the UI
// will show loading / error / empty fallbacks accordingly.

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>({
    forestCoverageData: [] as any[],
    landUseData: [] as any[],
    recentAlerts: [] as any[],
    stats: {} as Record<string, any>,
    environmental: {} as Record<string, any>,
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch('/api/dashboard')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch dashboard')))
      .then((json) => {
        if (!mounted) return;
        // Accept either a full object or an array of sections; be permissive
        if (!json || typeof json !== 'object') {
          setError('Invalid dashboard response');
          setData({ forestCoverageData: [], landUseData: [], recentAlerts: [], stats: {}, environmental: {} });
        } else {
          setData({
            forestCoverageData: Array.isArray(json.forestCoverageData) ? json.forestCoverageData : [],
            landUseData: Array.isArray(json.landUseData) ? json.landUseData : [],
            recentAlerts: Array.isArray(json.recentAlerts) ? json.recentAlerts : [],
            stats: json.stats || {},
            environmental: json.environmental || {},
            aiInsights: json.aiInsights ?? null,
            aiRaw: json.aiRaw ?? null,
            aiError: json.aiError ?? null,
          });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err?.message || err));
        setData({ forestCoverageData: [], landUseData: [], recentAlerts: [], stats: {}, environmental: {} });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  // AI insights are produced server-side now and included in the
  // `/api/dashboard` response under `aiInsights` / `aiRaw` / `aiError`.
  // The frontend simply consumes `data.stats` and `data.environmental`.

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-primary mb-2">Forest Monitoring Dashboard</h1>
        <p className="text-muted-foreground">Real-time AI insights from real data analytics.</p>
        {data.aiInsights ? (
          <div className="mt-3 p-3 bg-white/80 border border-border rounded-md text-sm text-foreground">
            <strong className="block mb-1">AI Insights</strong>
            <div>{data.aiInsights}</div>
          </div>
        ) : data.aiError ? (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-foreground">
            <strong className="block mb-1">AI Error</strong>
            <div>{String(data.aiError)}</div>
          </div>
        ) : null}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Forest Coverage</p>
              <h2 className="text-primary">{loading ? '—' : (data?.stats?.forestCoverage ?? '—')}</h2>
              <div className="flex items-center gap-1 mt-2 text-destructive">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">{loading ? '—' : (data?.stats?.coverageChange ?? '-')}</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Trees className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        {/* <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Active Alerts</p>
              <h2 className="text-destructive">{loading ? '—' : (data?.stats?.activeAlerts ?? 0)}</h2>
              <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                <span className="text-sm">{loading ? '—' : (data?.stats?.alertsBreakdown ?? '')}</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </div>
        </Card> */}

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Reforestation Progress</p>
              <h2 className="text-primary">{loading ? '—' : (data?.stats?.reforestationHectares ?? '—')}</h2>
              <div className="flex items-center gap-1 mt-2 text-primary">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">{loading ? '—' : (data?.stats?.reforestationDelta ?? '')}</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Carbon Sequestered</p>
              <h2 className="text-primary">{loading ? '—' : (data?.stats?.carbon ?? '—')}</h2>
              <div className="flex items-center gap-1 mt-2 text-primary">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">{loading ? '—' : (data?.stats?.carbonDelta ?? '')}</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wind className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forest Coverage Trend */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-4">Forest Coverage Trend (6 Months)</h3>
          {loading ? (
            <div className="p-12 text-center animate-pulse">
              <p className="text-muted-foreground">Loading chart…</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive">Failed to load chart</p>
            </div>
          ) : (data.forestCoverageData && data.forestCoverageData.length > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.forestCoverageData}>
                <defs>
                  <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: number) => `${value}%`}
                />
                <Area type="monotone" dataKey="coverage" stroke="#22c55e" fillOpacity={1} fill="url(#colorCoverage)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No coverage data available</p>
            </div>
          )}
        </Card>

        {/* Land Use Distribution */}
        <Card className="p-6">
          <h3 className="mb-4">Land Use Distribution</h3>
          {loading ? (
            <div className="p-12 text-center animate-pulse">Loading distribution…</div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">Failed to load distribution</div>
          ) : (data.landUseData && data.landUseData.length > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.landUseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.landUseData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {data.landUseData.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span>{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No land use data available</p>
            </div>
          )}
        </Card>
      </div>

      {/* Environmental Conditions */}
      <Card className="p-6">
        <h3 className="mb-4">Environmental Conditions (Average)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-primary" />
                <span>Soil Moisture</span>
              </div>
              <span>{loading ? '—' : (data.environmental?.soilMoisture ?? '—')}</span>
            </div>
            <Progress value={Number(data.environmental?.soilMoisture ?? 0)} className="h-2" />
            <p className="text-xs text-muted-foreground">Optimal range: 60-75%</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-primary" />
                <span>Vegetation Health</span>
              </div>
              <span>{loading ? '—' : (data.environmental?.vegetationHealth ?? '—')}</span>
            </div>
            <Progress value={Number(data.environmental?.vegetationHealth ?? 0)} className="h-2" />
            <p className="text-xs text-muted-foreground">Based on NDVI analysis</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-primary" />
                <span>Air Quality</span>
              </div>
              <span>{loading ? '—' : (data.environmental?.airQualityLabel ?? '—')}</span>
            </div>
            <Progress value={Number(data.environmental?.airQuality ?? 0)} className="h-2" />
            <p className="text-xs text-muted-foreground">AQI: {data.environmental?.airQuality ?? '—'}</p>
          </div>
        </div>
      </Card>

      {/* AI insights are merged into the placeholders automatically; no separate UI card */}

      {/* Recent Alerts */}
      {/* <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Recent Alerts</h3>
          <Badge variant="secondary">{loading ? '—' : (data?.stats?.activeAlerts ?? 0)} Active</Badge>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="p-6 animate-pulse">Loading recent alerts…</div>
          ) : (data.recentAlerts && data.recentAlerts.length > 0) ? (
            data.recentAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  alert.type === 'critical' ? 'bg-destructive' : 
                  alert.type === 'warning' ? 'bg-orange-500' : 
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-foreground">{alert.title}</h4>
                    <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'} className="flex-shrink-0">
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{alert.location}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{alert.time}</span>
                    <span>•</span>
                    <span>Area: {alert.area}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">No recent alerts</h3>
              <p className="text-sm text-muted-foreground">Your monitored areas have no recent activity.</p>
            </div>
          )}
        </div>
      </Card> */}
    </div>
  );
}
