import { useEffect, useState } from 'react';
import { AlertDetailsDialog } from './AlertDetailsDialog';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertTriangle, Bell, Search, MapPin, Calendar, TrendingUp, Filter, ExternalLink } from 'lucide-react';

// Alerts will be fetched from the API; show loading / empty fallback UIs when necessary

export function Alerts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = (alert.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (alert.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeAlerts = filteredAlerts.filter(a => a.status === 'active');
  const investigatingAlerts = filteredAlerts.filter(a => a.status === 'investigating');
  const resolvedAlerts = filteredAlerts.filter(a => a.status === 'resolved');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch('/api/alerts')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch')))
      .then((data) => {
        if (!mounted) return;
        if (!Array.isArray(data)) {
          setError('Invalid data from server');
          setAlerts([]);
        } else {
          setAlerts(data);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err?.message || err));
        setAlerts([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive';
      case 'warning': return 'bg-orange-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const AlertCard = ({ alert }: { alert: any }) => (
    <Card className="p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getSeverityColor(alert.severity)}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <h3 className="flex-1">{alert.title}</h3>
              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                {alert.severity}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{alert.location}</span>
              </div>
              <p className="text-sm">{alert.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Area Affected</p>
          <p className="text-sm">{alert.area}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
          <p className="text-sm">{alert.confidence}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Detected</p>
          <p className="text-sm">{alert.detected}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Source</p>
          <p className="text-sm">{alert.source}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="sm" variant="outline" className="cursor-pointer">
          <MapPin className="w-4 h-4 mr-2" />
          View on Map
        </Button>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => { setSelectedAlert(alert); setAlertOpen(true); }}>
          <ExternalLink className="w-4 h-4 mr-2" />
          View Details
        </Button>
        {alert.status === 'active' && (
          <Button size="sm" className='cursor-pointer'>
            Mark as Investigating
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-primary mb-2">AI-Based Alerts</h1>
          <p className="text-muted-foreground">
            Real-time deforestation and land activity alerts from satellite and drone monitoring
          </p>
        </div>
        {/* <div className="flex items-center gap-2">
          <Button variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Configure Alerts
          </Button>
        </div> */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Total Alerts</p>
              <h2 className="text-primary">{alerts.length}</h2>
            </div>
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Active</p>
              <h2 className="text-destructive">{activeAlerts.length}</h2>
            </div>
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Investigating</p>
              <h2 className="text-orange-500">{investigatingAlerts.length}</h2>
            </div>
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Resolved</p>
              <h2>{resolvedAlerts.length}</h2>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts by location or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full md:w-[180px] cursor-pointer">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className='cursor-pointer'>All Severities</SelectItem>
              <SelectItem value="critical" className='cursor-pointer'>Critical</SelectItem>
              <SelectItem value="warning" className='cursor-pointer'>Warning</SelectItem>
              <SelectItem value="info" className='cursor-pointer'>Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className='cursor-pointer'>All Statuses</SelectItem>
              <SelectItem value="active" className='cursor-pointer'>Active</SelectItem>
              <SelectItem value="investigating" className='cursor-pointer'>Investigating</SelectItem>
              <SelectItem value="resolved" className='cursor-pointer'>Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Alerts List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className='cursor-pointer'>
            All ({filteredAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="active" className='cursor-pointer'>
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="investigating" className='cursor-pointer' >
            Investigating ({investigatingAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className='cursor-pointer'>
            Resolved ({resolvedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {loading ? (
            <Card className="p-12 text-center animate-pulse">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">Loading alerts…</h3>
            </Card>
          ) : error ? (
            <Card className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-2" />
              <h3 className="text-destructive mb-2">Failed to load alerts</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </Card>
          ) : filteredAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">No alerts found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </Card>
          ) : (
            filteredAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4 mt-6">
          {loading ? (
            <Card className="p-12 text-center animate-pulse">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">Loading alerts…</h3>
            </Card>
          ) : activeAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">No active alerts</h3>
              <p className="text-sm text-muted-foreground">
                All alerts have been addressed or resolved
              </p>
            </Card>
          ) : (
            activeAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="investigating" className="space-y-4 mt-6">
          {loading ? (
            <Card className="p-12 text-center animate-pulse">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">Loading alerts…</h3>
            </Card>
          ) : investigatingAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">No alerts under investigation</h3>
            </Card>
          ) : (
            investigatingAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4 mt-6">
          {loading ? (
            <Card className="p-12 text-center animate-pulse">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">Loading alerts…</h3>
            </Card>
          ) : resolvedAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-muted-foreground mb-2">No resolved alerts</h3>
            </Card>
          ) : (
            resolvedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </TabsContent>
      </Tabs>
      <AlertDetailsDialog
        alert={selectedAlert}
        open={alertOpen}
        onOpenChange={(open) => {
          setAlertOpen(open);
          if (!open) setSelectedAlert(null);
        }}
      />
    </div>
  );
}
