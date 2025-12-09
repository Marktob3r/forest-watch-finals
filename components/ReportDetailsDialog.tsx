import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { MapPin, Calendar, Download, Image as ImageIcon } from 'lucide-react';

interface Report {
  id: string;
  type: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  severity?: string | null;
  status?: string | null;
  created_at?: string | null;
  images?: string[]; // storage paths
  imageUrls?: string[]; // signed urls returned by API
}

interface Props {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDetailsDialog({ report, open, onOpenChange }: Props) {
  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg mb-1">{report.type}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{report.location}</span>
                <span>•</span>
                <span>{report.created_at ? new Date(report.created_at).toLocaleString() : ''}</span>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={report.status === 'verified' ? 'default' : 'secondary'}>{report.status}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <h4 className="mb-2">Severity</h4>
            <p className="text-sm">{report.severity || '—'}</p>
          </div>

          <Separator />

          <div>
            <h4 className="mb-2">Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.description}</p>
          </div>

          <Separator />

          {report.imageUrls && report.imageUrls.length > 0 && (
            <div>
              <h4 className="mb-2">Photos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.imageUrls.map((url, i) => (
                  <div key={i} className="border rounded overflow-hidden">
                    {url ? (
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img src={url} alt={`Report image ${i + 1}`} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="p-6 flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(report.latitude || report.longitude) && (
            <div>
              <h4 className="mb-2">Coordinates</h4>
              <p className="text-sm">{report.latitude ?? '-'}, {report.longitude ?? '-'}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {report.imageUrls && report.imageUrls.length > 0 && (
              <Button onClick={() => { window.open(report.imageUrls?.[0], '_blank'); }}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
