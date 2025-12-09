import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import {
  MapPin,
  Calendar,
  Target,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface Alert {
  id: number;
  type: string;
  severity: string;
  title: string;
  location: string;
  coordinates: string;
  area: string;
  detected: string;
  confidence: number;
  description: string;
  status: string;
  source: string;
}

interface AlertDetailsDialogProps {
  alert: Alert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock data for additional details
const getAlertAnalysis = (alertId: number) => ({
  timeline: [
    {
      date: '2024-12-03 14:30',
      event: 'Alert Generated',
      description: 'AI system detected anomaly through satellite imagery analysis',
      actor: 'Automated System',
    },
    {
      date: '2024-12-03 14:35',
      event: 'Initial Verification',
      description: 'Confidence score calculated and imagery cross-referenced',
      actor: 'AI Verification System',
    },
    {
      date: '2024-12-03 14:40',
      event: 'Alert Published',
      description: 'Notification sent to relevant authorities and stakeholders',
      actor: 'Alert System',
    },
    {
      date: '2024-12-03 15:00',
      event: 'Under Review',
      description: 'Local forest ranger acknowledged alert',
      actor: 'Forest Ranger - M. Silva',
    },
  ],
  historicalData: [
    { date: 'Nov 28', deforestation: 0, confidence: 0 },
    { date: 'Nov 29', deforestation: 0, confidence: 0 },
    { date: 'Nov 30', deforestation: 12, confidence: 45 },
    { date: 'Dec 1', deforestation: 28, confidence: 68 },
    { date: 'Dec 2', deforestation: 38, confidence: 82 },
    { date: 'Dec 3', deforestation: 45, confidence: 95 },
  ],
  environmentalImpact: {
    estimatedTreeLoss: '~3,200 trees',
    carbonRelease: '~890 tonnes CO₂',
    biodiversityRisk: 'High',
    waterCycleImpact: 'Moderate',
  },
  nearbyAlerts: [
    {
      id: 2,
      distance: '12 km',
      type: 'Vegetation Health Decline',
      date: '2 days ago',
    },
    {
      id: 7,
      distance: '18 km',
      type: 'Land Clearing Activity',
      date: '5 days ago',
    },
  ],
  recommendations: [
    'Immediate on-site verification by local authorities',
    'Deploy drone survey for detailed assessment',
    'Contact landowner or local government',
    'Prepare potential enforcement action',
    'Monitor for continued activity',
  ],
  images: [
    { id: 1, label: 'Current Satellite View', date: 'Dec 3, 2024' },
    { id: 2, label: 'Comparison View (1 week ago)', date: 'Nov 26, 2024' },
    { id: 3, label: 'Change Detection Map', date: 'Dec 3, 2024' },
  ],
});

export function AlertDetailsDialog({ alert, open, onOpenChange }: AlertDetailsDialogProps) {
  if (!alert) return null;

  const analysis = getAlertAnalysis(alert.id);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-destructive';
      case 'warning':
        return 'text-orange-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleExportReport = () => {
    toast.success('Report exported successfully');
  };

  const handleShareAlert = () => {
    toast.success('Alert link copied to clipboard');
  };

  const handleMarkInvestigating = () => {
    toast.success('Alert marked as investigating');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{alert.title}</DialogTitle>
              <DialogDescription>
                Alert ID: #{alert.id} • Detected {alert.detected}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                className="text-sm"
              >
                {alert.severity}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {alert.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Key Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="text-sm">{alert.location}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.coordinates}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Area Affected</p>
                    <p className="text-sm">{alert.area}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Detection Source</p>
                    <p className="text-sm">{alert.source}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Confidence Score</p>
                    <p className="text-sm">{alert.confidence}%</p>
                    <div className="w-full bg-secondary h-2 rounded-full mt-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${alert.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Alert Type</p>
                    <p className="text-sm capitalize">{alert.type}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">First Detected</p>
                    <p className="text-sm">{alert.detected}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h4 className="mb-2">Alert Description</h4>
              <p className="text-sm text-muted-foreground">{alert.description}</p>
            </div>

            <Separator />

            {/* Environmental Impact */}
            <div>
              <h4 className="mb-3">Estimated Environmental Impact</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Tree Loss</p>
                  <p className="text-sm">{analysis.environmentalImpact.estimatedTreeLoss}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Carbon Release</p>
                  <p className="text-sm">{analysis.environmentalImpact.carbonRelease}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Biodiversity Risk</p>
                  <p className="text-sm">{analysis.environmentalImpact.biodiversityRisk}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Water Impact</p>
                  <p className="text-sm">{analysis.environmentalImpact.waterCycleImpact}</p>
                </div>
              </div>
            </div>

            {/* Nearby Alerts */}
            <div>
              <h4 className="mb-3">Nearby Related Alerts</h4>
              <div className="space-y-2">
                {analysis.nearbyAlerts.map((nearby) => (
                  <div
                    key={nearby.id}
                    className="p-3 border border-border rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm">{nearby.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {nearby.distance} away • {nearby.date}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4 mt-4">
            <div>
              <h4 className="mb-3">Historical Trend Analysis</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Deforestation activity progression over the past 7 days
              </p>
              <div className="space-y-2">
                {analysis.historicalData.map((data, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">{data.date}</span>
                    <div className="flex-1 bg-secondary h-8 rounded-md relative overflow-hidden">
                      <div
                        className="bg-destructive/80 h-full flex items-center px-3"
                        style={{ width: `${(data.deforestation / 45) * 100}%` }}
                      >
                        {data.deforestation > 0 && (
                          <span className="text-xs text-white">{data.deforestation} ha</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs w-16 text-right">{data.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Satellite/Drone Imagery */}
            <div>
              <h4 className="mb-3">Imagery & Evidence</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.images.map((image) => (
                  <div key={image.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-secondary flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm mb-1">{image.label}</p>
                      <p className="text-xs text-muted-foreground">{image.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* AI Analysis Details */}
            <div>
              <h4 className="mb-3">AI Analysis Details</h4>
              <div className="space-y-3">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm mb-1">Detection Method</p>
                  <p className="text-xs text-muted-foreground">
                    Multi-spectral satellite imagery analysis using convolutional neural networks
                    (CNN) trained on historical deforestation patterns
                  </p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm mb-1">Pattern Recognition</p>
                  <p className="text-xs text-muted-foreground">
                    Detected characteristic clearing patterns consistent with logging operations.
                    NDVI values show significant vegetation loss.
                  </p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm mb-1">Cross-Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Alert verified across multiple satellite passes and correlated with thermal
                    imaging data
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            <div className="space-y-4">
              {analysis.timeline.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    {index < analysis.timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm">{event.event}</h4>
                      <span className="text-xs text-muted-foreground">{event.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{event.description}</p>
                    <p className="text-xs text-muted-foreground">{event.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4 mt-4">
            <div>
              <h4 className="mb-3">Recommended Actions</h4>
              <div className="space-y-2">
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3">Available Actions</h4>
              <div className="space-y-2">
                <Button className="w-full justify-start" onClick={handleMarkInvestigating}>
                  <Activity className="w-4 h-4 mr-2" />
                  Mark as Investigating
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Interactive Map
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleExportReport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Detailed Report (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleShareAlert}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Alert with Authorities
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Incident Report
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
