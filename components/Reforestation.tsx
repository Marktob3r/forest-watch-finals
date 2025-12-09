import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trees, Leaf, TrendingUp, MapPin, Calendar, Users, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useState, useEffect } from 'react';
import { NewProjectForm } from './NewProjectForm';
import { ProjectDetailsDialog } from './ProjectDetailsDialog';
import { ProjectTimelineDialog } from './ProjectTimelineDialog';

// Static mock data (commented out to prepare for dynamic real-time data)
/*
const carbonSequestrationData = [
  { month: 'Jul', carbon: 2156 },
  { month: 'Aug', carbon: 2398 },
  { month: 'Sep', carbon: 2645 },
  { month: 'Oct', carbon: 2890 },
  { month: 'Nov', carbon: 3142 },
  { month: 'Dec', carbon: 3421 },
];

const reforestationProjects = [
  {
    id: 1,
    name: 'Amazon Restoration Initiative',
    location: 'Amazon Basin, Brazil',
    startDate: 'Jan 2024',
    status: 'active',
    progress: 67,
    areaTarget: 500,
    areaPlanted: 335,
    treesPlanted: 45000,
    treesTarget: 67000,
    carbonSequestered: 1245,
    partners: ['Green Earth Foundation', 'Local Communities'],
    species: ['Brazil Nut', 'Mahogany', 'Cecropia'],
  },
  // ...other example projects
];
*/

// Note: projects and carbon data are loaded at runtime from the API

export function Reforestation() {
  const [projects, setProjects] = useState<any[]>([]);
  const [carbonData, setCarbonData] = useState<Array<{ month?: string; carbon?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/projects')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json?.ok) {
          if (Array.isArray(json.projects)) setProjects(json.projects as any[]);
          else setProjects([]);
          // wire carbonTrend if present
          if (Array.isArray(json.carbonTrend)) setCarbonData(json.carbonTrend as any[]);
        } else {
          setProjects([]);
        }
      })
      .catch((e) => {
        if (!mounted) return;
        console.error('Failed to load projects', e);
        setError('Failed to load projects');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  // derive simple totals from fetched projects
  const totalStats = {
    totalProjects: projects.length,
    totalAreaPlanted: projects.reduce((sum: number, p: any) => sum + (p.area_planted || p.areaPlanted || 0), 0),
    totalTreesPlanted: projects.reduce((sum: number, p: any) => sum + (p.trees_planted || p.treesPlanted || 0), 0),
    totalCarbonSequestered: projects.reduce((sum: number, p: any) => sum + (p.carbon_sequestered || p.carbonSequestered || 0), 0),
  };

  const countriesCount = Array.from(new Set(projects.map((p: any) => p.country || p.location || '').filter(Boolean))).length;
  // Helpers to safely read and format numeric fields that may come back as
  // snake_case or camelCase, or may be missing in older schemas.
  const getField = (project: any, camel: string, snake: string) => {
    if (!project) return null;
    if (typeof project[camel] !== 'undefined' && project[camel] !== null) return project[camel];
    if (typeof project[snake] !== 'undefined' && project[snake] !== null) return project[snake];
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
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-primary mb-2">Reforestation Tracker</h1>
          <p className="text-muted-foreground">
            Monitor ongoing reforestation projects and carbon sequestration impact
          </p>
        </div>
        <>
          <Button className='cursor-pointer' onClick={() => setNewProjectOpen(true)}>
            <Trees className="w-4 h-4 mr-2" />
            Start New Project
          </Button>
          <NewProjectForm open={newProjectOpen} onOpenChange={setNewProjectOpen} />
        </>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground">Active Projects</p>
            <Trees className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-primary">{totalStats.totalProjects || '-'}</h2>
          <p className="text-xs text-muted-foreground mt-1">{countriesCount > 0 ? `Across ${countriesCount} countries` : 'No country data'}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground">Area Planted</p>
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-primary">{totalStats.totalAreaPlanted > 0 ? `${totalStats.totalAreaPlanted.toLocaleString()} ha` : '-'}</h2>
          <div className="flex items-center gap-1 text-xs text-primary mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>{totalStats.totalAreaPlanted > 0 ? '+156 ha this month' : 'No recent data'}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground">Trees Planted</p>
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-primary">{totalStats.totalTreesPlanted > 0 ? totalStats.totalTreesPlanted.toLocaleString() : '-'}</h2>
          <div className="flex items-center gap-1 text-xs text-primary mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>{totalStats.totalTreesPlanted > 0 ? '+8,400 this month' : 'No recent data'}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground">Carbon Sequestered</p>
            <Target className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-primary">{totalStats.totalCarbonSequestered > 0 ? `${totalStats.totalCarbonSequestered.toLocaleString()} t` : '-'}</h2>
          <div className="flex items-center gap-1 text-xs text-primary mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>{totalStats.totalCarbonSequestered > 0 ? '+279 t this month' : 'No recent data'}</span>
          </div>
        </Card>
      </div>

      {/* Carbon Sequestration Chart */}
      <Card className="p-6">
        <h3 className="mb-4">Carbon Sequestration Trend (6 Months)</h3>
        {carbonData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="mb-2">No carbon sequestration data available yet.</p>
            <p className="text-sm">Live metrics will appear here when the data pipeline is connected.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={carbonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: number) => [`${value} tonnes CO₂`, 'Carbon Sequestered']}
              />
              <Line type="monotone" dataKey="carbon" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Projects */}
      <div>
        <h3 className="mb-4">Active Reforestation Projects</h3>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" className='cursor-pointer'>All Projects</TabsTrigger>
            <TabsTrigger value="high-progress" className='cursor-pointer'>High Progress</TabsTrigger>
            <TabsTrigger value="impact" className='cursor-pointer'>High Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
              {projects.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <div className="p-8">
                  <h4 className="mb-2">No active reforestation projects</h4>
                  <p className="text-sm mb-4">Projects will appear here when connected to the live backend.</p>
                  <div className="flex justify-center">
                    <Button onClick={() => setNewProjectOpen(true)} className="cursor-pointer">Start New Project</Button>
                  </div>
                </div>
              </Card>
            ) : (
              projects.map((project) => (
                <Card key={project.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="mb-1">{project.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{project.country || project.location || project.region || '—'}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">{project.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Area Progress</p>
                          <p className="text-sm">{formatHectares(getField(project, 'areaPlanted', 'area_planted'))} / {getField(project, 'areaTarget', 'area_target') ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Trees Planted</p>
                          <p className="text-sm">{formatNumber(getField(project, 'treesPlanted', 'trees_planted'))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Carbon Sequestered</p>
                          <p className="text-sm">{formatNumber(getField(project, 'carbonSequestered', 'carbon_sequestered'))} t CO₂</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Started</p>
                          <p className="text-sm">{getField(project, 'startDate', 'start_date') ?? '—'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-48">
                      <div className="text-center mb-2">
                        <span className="text-2xl text-primary">{getField(project, 'progress', 'progress') ?? 0}%</span>
                        <p className="text-xs text-muted-foreground">Complete</p>
                      </div>
                      <Progress value={Number(getField(project, 'progress', 'progress') ?? 0)} className="h-2" />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 mt-4 space-y-3">
                    <div>
                      <p className="text-sm mb-2">Key Species:</p>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(project.species) ? project.species : []).map((species: string) => (
                          <Badge key={species} variant="outline">
                            {species}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm mb-2">Partners:</p>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(project.partners) ? project.partners : []).map((partner: string) => (
                          <Badge key={partner} variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {partner}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setSelectedProject(project); /* TODO: open map view */ }}>
                        <MapPin className="w-4 h-4 mr-2" />
                        View on Map
                      </Button>
                      <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setSelectedProject(project); setTimelineOpen(true); }}>
                        <Calendar className="w-4 h-4 mr-2" />
                        View Timeline
                      </Button>
                      <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setSelectedProject(project); setDetailsOpen(true); }}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="high-progress" className="space-y-4 mt-6">
            {projects
              .filter((p: any) => (p.progress || 0) >= 50)
              .map((project: any) => (
                <Card key={project.id} className="p-6">
                  {/* Same card content as above */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="mb-1">{project.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{project.country || project.location || project.region || '—'}</span>
                      </div>
                    </div>
                      <div className="text-right">
                        <span className="text-2xl text-primary">{getField(project, 'progress', 'progress') ?? 0}%</span>
                        <p className="text-xs text-muted-foreground">Complete</p>
                        <Progress value={Number(getField(project, 'progress', 'progress') ?? 0)} className="h-2 w-24 mt-2" />
                    </div>
                  </div>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="impact" className="space-y-4 mt-6">
            {projects
              .slice()
              .sort((a: any, b: any) => ( (b.carbon_sequestered ?? b.carbonSequestered ?? 0) - (a.carbon_sequestered ?? a.carbonSequestered ?? 0) ))
              .map((project: any) => (
                <Card key={project.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="mb-1">{project.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{project.country || project.location || project.region || '—'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl text-primary">{formatNumber(getField(project, 'carbonSequestered', 'carbon_sequestered'))} t</span>
                      <p className="text-xs text-muted-foreground">CO₂ Sequestered</p>
                    </div>
                  </div>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
        {/* Dialogs */}
        <ProjectDetailsDialog
          project={selectedProject}
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setSelectedProject(null);
          }}
        />

        <ProjectTimelineDialog
          project={selectedProject}
          open={timelineOpen}
          onOpenChange={(open) => {
            setTimelineOpen(open);
            if (!open) setSelectedProject(null);
          }}
        />
      </div>
    </div>
  );
}
