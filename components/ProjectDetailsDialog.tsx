import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  MapPin,
  Calendar,
  Target,
  TrendingUp,
  Users,
  Leaf,
  Droplets,
  Wind,
  Sun,
  TreeDeciduous,
  BarChart3,
  FileText,
  Download,
  Share2,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface Project {
  id: number;
  name: string;
  location: string;
  startDate: string;
  status: string;
  progress: number;
  areaTarget: number;
  areaPlanted: number;
  treesPlanted: number;
  treesTarget: number;
  carbonSequestered: number;
  partners: string[];
  species: string[];
}

interface ProjectDetailsDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock detailed data
const getProjectDetails = (projectId: number) => ({
  description:
    'A comprehensive reforestation initiative focused on restoring degraded forest areas in the Amazon Basin. The project aims to plant native tree species, restore biodiversity corridors, and sequester significant amounts of carbon while supporting local communities.',
  objectives: [
    'Restore 500 hectares of degraded forest land',
    'Plant 67,000 native tree species',
    'Sequester 2,000+ tonnes of CO₂ annually',
    'Create sustainable livelihoods for 200+ local families',
    'Establish biodiversity monitoring systems',
  ],
  monthlyProgress: [
    { month: 'Jan', trees: 0, area: 0 },
    { month: 'Feb', trees: 0, area: 50 },
    { month: 'Mar', trees: 15000, area: 120 },
    { month: 'Apr', trees: 21000, area: 168 },
    { month: 'May', trees: 33000, area: 240 },
    { month: 'Jun', trees: 37000, area: 270 },
    { month: 'Jul', trees: 40000, area: 290 },
    { month: 'Aug', trees: 45000, area: 335 },
  ],
  carbonSequestration: [
    { month: 'Mar', carbon: 120 },
    { month: 'Apr', carbon: 280 },
    { month: 'May', carbon: 490 },
    { month: 'Jun', carbon: 680 },
    { month: 'Jul', carbon: 920 },
    { month: 'Aug', carbon: 1245 },
  ],
  biodiversity: {
    speciesCount: 3,
    nativeSpeciesRate: 100,
    survivalRate: 92,
    wildlifeObserved: [
      'Jaguar (Panthera onca)',
      'Harpy Eagle (Harpia harpyja)',
      'Giant Otter (Pteronura brasiliensis)',
      'Amazon River Dolphin (Inia geoffrensis)',
    ],
  },
  communityImpact: {
    jobsCreated: 234,
    familiesSupported: 187,
    trainingPrograms: 12,
    localInvestment: '$450,000',
  },
  environmentalData: {
    soilQuality: 'Improving',
    waterRetention: '+23%',
    airQuality: 'Excellent',
    temperature: '-1.2°C avg decrease',
  },
  funding: {
    totalBudget: '$2,500,000',
    spent: '$1,675,000',
    remaining: '$825,000',
    sources: [
      { name: 'Green Earth Foundation', amount: '$1,000,000' },
      { name: 'Government Grant', amount: '$800,000' },
      { name: 'Corporate Sponsors', amount: '$500,000' },
      { name: 'Community Fundraising', amount: '$200,000' },
    ],
  },
  team: [
    { name: 'Dr. Carlos Silva', role: 'Project Lead', organization: 'Green Earth Foundation' },
    { name: 'Maria Santos', role: 'Field Coordinator', organization: 'Local Communities' },
    { name: 'Prof. Ana Torres', role: 'Ecological Advisor', organization: 'University of São Paulo' },
  ],
});

export function ProjectDetailsDialog({
  project,
  open,
  onOpenChange,
}: ProjectDetailsDialogProps) {
  if (!project) return null;

  const details = getProjectDetails(project.id);

  // Safe helpers for numeric fields and snake_case compatibility
  const getField = (obj: any, camel: string, snake: string) => {
    if (!obj) return null;
    if (typeof obj[camel] !== 'undefined' && obj[camel] !== null) return obj[camel];
    if (typeof obj[snake] !== 'undefined' && obj[snake] !== null) return obj[snake];
    return null;
  };

  const formatNumber = (value: any) => {
    const n = value == null ? null : Number(value);
    if (n === null || Number.isNaN(n)) return '-';
    return n.toLocaleString();
  };

  const formatHectares = (value: any) => {
    const n = value == null ? null : Number(value);
    if (n === null || Number.isNaN(n)) return '-';
    return `${n.toLocaleString()} ha`;
  };

  const handleExportReport = () => {
    toast.success('Project report exported successfully');
  };

  const handleShareProject = () => {
    toast.success('Project link copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{project.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {project.location} • Started {project.startDate}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{project.status}</Badge>
              <Badge variant="outline">{project.progress}% Complete</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Progress Summary */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4>Project Progress</h4>
                <span className="text-2xl text-primary">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-3 mb-4" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Area Progress</p>
                  </div>
                  <p className="text-sm">
                    {(() => {
                      const a = getField(project, 'areaPlanted', 'area_planted');
                      const t = getField(project, 'areaTarget', 'area_target');
                      const aStr = a == null || Number.isNaN(Number(a)) ? '-' : `${Number(a).toLocaleString()} ha`;
                      const tStr = t == null || Number.isNaN(Number(t)) ? '-' : `${Number(t).toLocaleString()} ha`;
                      return `${aStr} / ${tStr}`;
                    })()}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TreeDeciduous className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Trees Planted</p>
                  </div>
                  <p className="text-sm">
                    {(() => {
                      const a = getField(project, 'treesPlanted', 'trees_planted');
                      const t = getField(project, 'treesTarget', 'trees_target');
                      const aStr = a == null || Number.isNaN(Number(a)) ? '-' : Number(a).toLocaleString();
                      const tStr = t == null || Number.isNaN(Number(t)) ? '-' : Number(t).toLocaleString();
                      return `${aStr} / ${tStr}`;
                    })()}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Carbon Captured</p>
                  </div>
                  <p className="text-sm">{project.carbonSequestered} t CO₂</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Survival Rate</p>
                  </div>
                  <p className="text-sm">{details.biodiversity.survivalRate}%</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h4 className="mb-2">Project Description</h4>
              <p className="text-sm text-muted-foreground">{details.description}</p>
            </div>

            <Separator />

            {/* Objectives */}
            <div>
              <h4 className="mb-3">Key Objectives</h4>
              <div className="space-y-2">
                {details.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{objective}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Partners and Species */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="mb-3">Project Partners</h4>
                <div className="space-y-2">
                  {(project.partners || []).map((partner, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                    >
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm">{partner}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-3">Tree Species ({(project.species || []).length})</h4>
                <div className="flex flex-wrap gap-2">
                  {(project.species || []).map((species, index) => (
                    <Badge key={index} variant="outline">
                      <Leaf className="w-3 h-3 mr-1" />
                      {species}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Team */}
            <div>
              <h4 className="mb-3">Project Team</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {details.team.map((member, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg">
                    <p className="text-sm mb-1">{member.name}</p>
                    <p className="text-xs text-muted-foreground mb-1">{member.role}</p>
                    <p className="text-xs text-muted-foreground">{member.organization}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4 mt-4">
            <div>
              <h4 className="mb-3">Planting Progress Over Time</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={details.monthlyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis yAxisId="left" stroke="#6b7280" />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="trees"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Trees Planted"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="area"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Area (ha)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3">Carbon Sequestration Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={details.carbonSequestration}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} tonnes CO₂`, 'Carbon Sequestered']}
                  />
                  <Bar dataKey="carbon" fill="#22c55e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3">Funding Overview</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
                    <p className="text-lg">{details.funding.totalBudget}</p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Spent</p>
                    <p className="text-lg">{details.funding.spent}</p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                    <p className="text-lg">{details.funding.remaining}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm mb-2">Funding Sources</p>
                  <div className="space-y-2">
                    {details.funding.sources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-border rounded-lg">
                        <span className="text-sm">{source.name}</span>
                        <span className="text-sm">{source.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Impact Tab */}
          <TabsContent value="impact" className="space-y-4 mt-4">
            <div>
              <h4 className="mb-3">Environmental Impact</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-green-500/10 border border-green-200 rounded-lg">
                  <Droplets className="w-6 h-6 text-green-600 mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Water Retention</p>
                  <p className="text-sm">{details.environmentalData.waterRetention}</p>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-200 rounded-lg">
                  <Wind className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Air Quality</p>
                  <p className="text-sm">{details.environmentalData.airQuality}</p>
                </div>
                <div className="p-4 bg-orange-500/10 border border-orange-200 rounded-lg">
                  <Sun className="w-6 h-6 text-orange-600 mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                  <p className="text-sm">{details.environmentalData.temperature}</p>
                </div>
                <div className="p-4 bg-amber-500/10 border border-amber-200 rounded-lg">
                  <Target className="w-6 h-6 text-amber-600 mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Soil Quality</p>
                  <p className="text-sm">{details.environmentalData.soilQuality}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3">Biodiversity Indicators</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Species Diversity</p>
                  <p className="text-2xl text-primary">{details.biodiversity.speciesCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Native species planted</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Native Species</p>
                  <p className="text-2xl text-primary">{details.biodiversity.nativeSpeciesRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Of total plantings</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Tree Survival</p>
                  <p className="text-2xl text-primary">{details.biodiversity.survivalRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Survival rate</p>
                </div>
              </div>

              <div>
                <p className="text-sm mb-2">Wildlife Observed in Restored Area</p>
                <div className="space-y-2">
                  {details.biodiversity.wildlifeObserved.map((species, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                      <Leaf className="w-4 h-4 text-primary" />
                      <span className="text-sm">{species}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-4 mt-4">
            <div>
              <h4 className="mb-3">Community Impact</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <Users className="w-6 h-6 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Jobs Created</p>
                  <p className="text-2xl text-primary">{details.communityImpact.jobsCreated}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <Users className="w-6 h-6 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Families Supported</p>
                  <p className="text-2xl text-primary">{details.communityImpact.familiesSupported}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <FileText className="w-6 h-6 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Training Programs</p>
                  <p className="text-2xl text-primary">{details.communityImpact.trainingPrograms}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <Target className="w-6 h-6 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Local Investment</p>
                  <p className="text-2xl text-primary">{details.communityImpact.localInvestment}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="mb-3">Community Benefits</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm mb-1">Economic Opportunities</p>
                  <p className="text-xs text-muted-foreground">
                    Created sustainable employment for local communities through tree planting,
                    maintenance, and monitoring activities.
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1">Capacity Building</p>
                  <p className="text-xs text-muted-foreground">
                    Provided training in sustainable forestry practices, environmental monitoring,
                    and eco-tourism development.
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1">Cultural Preservation</p>
                  <p className="text-xs text-muted-foreground">
                    Integrated traditional indigenous knowledge in species selection and land
                    management practices.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-4 mt-4">
            <div>
              <h4 className="mb-3">Project Metrics Summary</h4>
              <div className="space-y-3">
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Area Planted</span>
                    <span className="text-sm">{project.areaPlanted} hectares</span>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Trees Planted</span>
                    <span className="text-sm">{(() => {
                      const t = getField(project, 'treesPlanted', 'trees_planted');
                      return t == null || Number.isNaN(Number(t)) ? '- trees' : `${Number(t).toLocaleString()} trees`;
                    })()}</span>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Carbon Sequestered</span>
                    <span className="text-sm">{project.carbonSequestered} tonnes CO₂</span>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Survival Rate</span>
                    <span className="text-sm">{details.biodiversity.survivalRate}%</span>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Jobs Created</span>
                    <span className="text-sm">{details.communityImpact.jobsCreated}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3">Export Options</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={handleExportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Project Report (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Analytics Data (CSV)
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleShareProject}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Project Summary
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              View Timeline
            </Button>
            <Button onClick={() => { try { window.location.href = `/monitor?projectId=${project.id}`; } catch (e) {} }}>
              <MapPin className="w-4 h-4 mr-2" />
              View on Map
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}