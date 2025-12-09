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
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Leaf,
  MapPin,
  TrendingUp,
  Users,
  Sprout,
  TreeDeciduous,
} from 'lucide-react';

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

interface ProjectTimelineDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock timeline data
const getProjectTimeline = (projectId: number) => [
  {
    id: 1,
    date: 'Jan 15, 2024',
    phase: 'Planning',
    status: 'completed',
    title: 'Project Initiation',
    description: 'Initial site assessment and planning completed. Environmental impact study approved.',
    milestone: true,
    metrics: {
      areaPrepared: 0,
      treesPlanted: 0,
    },
  },
  {
    id: 2,
    date: 'Feb 1, 2024',
    phase: 'Planning',
    status: 'completed',
    title: 'Land Preparation Begins',
    description: 'Clearing of invasive species and soil preparation started.',
    milestone: false,
    metrics: {
      areaPrepared: 50,
      treesPlanted: 0,
    },
  },
  {
    id: 3,
    date: 'Feb 28, 2024',
    phase: 'Planning',
    status: 'completed',
    title: 'Land Preparation Complete',
    description: 'All designated areas prepared for planting. Irrigation systems installed.',
    milestone: true,
    metrics: {
      areaPrepared: 335,
      treesPlanted: 0,
    },
  },
  {
    id: 4,
    date: 'Mar 10, 2024',
    phase: 'Planting',
    status: 'completed',
    title: 'Phase 1 Planting',
    description: 'First batch of 15,000 trees planted across 120 hectares.',
    milestone: true,
    metrics: {
      areaPrepared: 335,
      treesPlanted: 15000,
    },
  },
  {
    id: 5,
    date: 'May 15, 2024',
    phase: 'Planting',
    status: 'completed',
    title: 'Phase 2 Planting',
    description: 'Second planting phase completed. 18,000 additional trees planted.',
    milestone: true,
    metrics: {
      areaPrepared: 335,
      treesPlanted: 33000,
    },
  },
  {
    id: 6,
    date: 'Aug 20, 2024',
    phase: 'Planting',
    status: 'completed',
    title: 'Phase 3 Planting',
    description: 'Third phase completed. Total of 45,000 trees now planted.',
    milestone: true,
    metrics: {
      areaPrepared: 335,
      treesPlanted: 45000,
    },
  },
  {
    id: 7,
    date: 'Dec 3, 2024',
    phase: 'Maintenance',
    status: 'current',
    title: 'Ongoing Monitoring & Care',
    description: 'Regular maintenance, watering, and monitoring of planted areas. 92% survival rate.',
    milestone: false,
    metrics: {
      areaPrepared: 335,
      treesPlanted: 45000,
    },
  },
  {
    id: 8,
    date: 'Mar 2025',
    phase: 'Planting',
    status: 'upcoming',
    title: 'Phase 4 Planting (Planned)',
    description: 'Final planting phase to complete project goals.',
    milestone: true,
    metrics: {
      areaPrepared: 335,
      treesPlanted: 67000,
    },
  },
  {
    id: 9,
    date: 'Jun 2025',
    phase: 'Completion',
    status: 'upcoming',
    title: 'Project Completion',
    description: 'Target completion date for all planting activities.',
    milestone: true,
    metrics: {
      areaPrepared: 500,
      treesPlanted: 67000,
    },
  },
];

export function ProjectTimelineDialog({
  project,
  open,
  onOpenChange,
}: ProjectTimelineDialogProps) {
  if (!project) return null;

  const timeline = getProjectTimeline(project.id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'current':
        return <Clock className="w-5 h-5 text-orange-500 animate-pulse" />;
      case 'upcoming':
        return <Circle className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  // Helpers to safely read and format fields that may be missing or in snake_case
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

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Planning':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'Planting':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'Maintenance':
        return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'Completion':
        return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default:
        return 'bg-secondary text-foreground border-border';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{project.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {project.location}
              </DialogDescription>
            </div>
            <Badge variant="secondary">{project.status}</Badge>
          </div>
        </DialogHeader>

        {/* Project Progress Summary */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4>Overall Progress</h4>
            <span className="text-2xl text-primary">
              {(() => {
                const p = getField(project, 'progress', 'progress');
                return p == null || Number.isNaN(Number(p)) ? '-' : `${Number(p).toLocaleString()}%`;
              })()}
            </span>
          </div>
          <Progress value={Number(getField(project, 'progress', 'progress') || 0)} className="h-2 mb-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Area Planted</p>
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
              <p className="text-xs text-muted-foreground mb-1">Trees Planted</p>
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
              <p className="text-xs text-muted-foreground mb-1">Carbon Sequestered</p>
              <p className="text-sm">{(() => {
                const c = getField(project, 'carbonSequestered', 'carbon_sequestered');
                return c == null || Number.isNaN(Number(c)) ? '-' : `${Number(c).toLocaleString()} t CO₂`;
              })()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Started</p>
              <p className="text-sm">{project.startDate ?? '-'}</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Timeline */}
        <div>
          <h4 className="mb-4">Project Timeline</h4>
          <div className="space-y-6">
            {timeline.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={event.milestone ? 'scale-125' : ''}>
                    {getStatusIcon(event.status)}
                  </div>
                  {index < timeline.length - 1 && (
                    <div
                      className={`w-0.5 h-full mt-2 ${
                        event.status === 'completed'
                          ? 'bg-primary'
                          : 'bg-border'
                      }`}
                    />
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm">{event.title}</h4>
                      {event.milestone && (
                        <Badge variant="outline" className="text-xs">
                          Milestone
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getPhaseColor(event.phase)}`}>
                        {event.phase}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{event.date}</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{event.description}</p>

                  {/* Metrics for completed events */}
                  {event.status === 'completed' && (
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span>{(() => {
                          const a = getField(event.metrics, 'areaPrepared', 'area_prepared');
                          return a == null || Number.isNaN(Number(a)) ? '- ha prepared' : `${Number(a).toLocaleString()} ha prepared`;
                        })()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-primary" />
                        <span>{(() => {
                          const t = getField(event.metrics, 'treesPlanted', 'trees_planted');
                          return t == null || Number.isNaN(Number(t)) ? '- trees' : `${Number(t).toLocaleString()} trees`;
                        })()}</span>
                      </div>
                    </div>
                  )}

                  {/* Special styling for current phase */}
                  {event.status === 'current' && (
                    <div className="mt-3 p-3 bg-orange-500/10 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Clock className="w-4 h-4" />
                        <span>Current Phase</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Phase Summary */}
        <div>
          <h4 className="mb-3">Phase Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-500/10 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sprout className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-600">Planning</p>
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TreeDeciduous className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-600">Planting</p>
              </div>
              <p className="text-xs text-muted-foreground">67% Complete</p>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-600">Maintenance</p>
              </div>
              <p className="text-xs text-muted-foreground">Ongoing</p>
            </div>
            <div className="p-3 bg-secondary border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Completion</p>
              </div>
              <p className="text-xs text-muted-foreground">Jun 2025</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Partners & Species */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="mb-3">Project Partners</h4>
            <div className="flex flex-wrap gap-2">
              {(project.partners || []).map((partner, index) => (
                <Badge key={index} variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  {partner}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3">Tree Species</h4>
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

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => { try { window.location.href = `/monitor?projectId=${project.id}`; } catch (e) {} }}>
            <MapPin className="w-4 h-4 mr-2" />
            View on Map
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
