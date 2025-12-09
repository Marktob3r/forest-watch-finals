import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BookOpen, Video, FileText, Search, ExternalLink, Download, Clock, Star } from 'lucide-react';

/*
  NOTE: The following mock content was used as a visual guide. Commented out so the UI
  only renders server-provided discovery results.

  // Mock educational content
  const articles = [ ... ];
  const videos = [ ... ];
  const guides = [ ... ];

  If you need the original mocks restored for local demoing, uncomment and restore the arrays above.
*/



export function Learn() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load recommendations that might have been stored at login
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('fw_recommendations');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setResults(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Developer helper: populate sample recommendations for local testing
  function injectSampleRecommendations() {
    const sample = [
      { title: 'Satellite Monitoring: From Space to Action', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', shortSummary: 'How satellites detect deforestation in near-real time', estimatedRating: 4.8 },
      { title: 'Forest Monitoring Best Practices (PDF)', url: 'https://example.com/forest-monitoring.pdf', shortSummary: 'Complete guide to setting up forest monitoring', estimatedRating: 4.6 },
      { title: 'AI for Deforestation Detection', url: 'https://example.com/ai-deforestation', shortSummary: 'Overview of AI methods for detecting forest loss', estimatedRating: 4.7 },
    ];
    try {
      sessionStorage.setItem('fw_recommendations', JSON.stringify(sample));
    } catch (e) {}
    setResults(sample);
  }

  type RemoteItem = {
    title: string;
    url?: string;
    shortSummary?: string;
    estimatedRating?: number;
    confidence?: string;
  };

  function classify(item: RemoteItem) {
    const url = item.url || '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
    if (url.endsWith('.pdf') || url.toLowerCase().includes('.pdf')) return 'guide';
    return 'article';
  }

  async function fetchDiscovery() {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setError(data?.error || 'No results');
        setResults(null);
      } else {
        setResults(data.items || []);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function downloadViaProxy(url?: string) {
    if (!url) return;
    try {
      const res = await fetch('/api/ai/fetch-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to fetch file');
      }
      const blob = await res.blob();
      // try to get filename from content-disposition
      const cd = res.headers.get('content-disposition') || '';
      let filename = 'download.pdf';
      const m = /filename\*=UTF-8''([^;\n]+)/i.exec(cd) || /filename=\"?([^\";]+)\"?/i.exec(cd);
      if (m && m[1]) filename = decodeURIComponent(m[1]);
      else {
        try {
          const u = new URL(url);
          const last = u.pathname.split('/').pop() || 'file';
          filename = last.includes('.') ? last : `${last}.pdf`;
        } catch (e) {}
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Download failed', e);
      setError(e?.message || 'Download failed');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-primary mb-2">Learning Center</h1>
        <p className="text-muted-foreground">
          Educational resources, tutorials, and guides for forest monitoring and conservation
        </p>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles, videos, guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchDiscovery(); }}
                className="pl-10 w-full"
              />
            </div>
            <div className="shrink-0">
              <Button onClick={() => fetchDiscovery()} disabled={loading}>
                {loading ? 'Searching…' : 'Search'}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {results && <Badge variant="secondary">{results.length} results</Badge>}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </div>
      </Card>

      {/* Content Tabs */}
      {/* Recommended Section (shows immediately when results exist) */}
      {results && results.length > 0 && (
        <div>
          <h2 className="text-lg font-medium">Recommended for you</h2>
          <p className="text-sm text-muted-foreground mb-4">AI-curated articles, videos and guides based on your interests</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {results.slice(0, 6).map((it: any, i: number) => {
              const kind = classify(it as any);
              return (
                <Card key={it.title + i} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex gap-3 items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                      {kind === 'video' ? <Video className="w-6 h-6 text-primary" /> : <FileText className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium line-clamp-2">{it.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{it.shortSummary || it.snippet || ''}</p>
                      <div className="mt-3 flex items-center gap-2">
                        {it.url && (
                          <Button variant="ghost" size="sm" onClick={() => window.open(it.url, '_blank')}>
                            Open
                          </Button>
                        )}
                        {kind === 'guide' && it.url && (
                          <Button variant="outline" size="sm" onClick={() => downloadViaProxy(it.url)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {/* Dev helper: show button to inject sample recommendations when none exist */}
      {(!results || results.length === 0) && (
        <div className="mt-6">
          <Button variant="ghost" onClick={injectSampleRecommendations}>Show sample recommendations (dev)</Button>
        </div>
      )}
      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles" className="cursor-pointer">
            <FileText className="w-4 h-4 mr-2" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="videos" className="cursor-pointer">
            <Video className="w-4 h-4 mr-2" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="guides" className="cursor-pointer">
            <Download className="w-4 h-4 mr-2" />
            Guides
          </TabsTrigger>
        </TabsList>

        {/* Articles */}
        <TabsContent value="articles" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(results && results.length > 0 ? results.filter((r) => classify(r) === 'article') : []).map((article: any, idx: number) => (
              <Card key={article.id || article.title + idx} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm line-clamp-2">{article.title}</h3>
                      <Badge variant="secondary" className="shrink-0">{article.level || ''}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{article.shortSummary || article.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{article.readTime || ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{article.estimatedRating ?? article.rating ?? ''}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => { if (article.url) window.open(article.url, '_blank'); }}>
                        Read <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Videos */}
        <TabsContent value="videos" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(results && results.length > 0 ? results.filter((r) => classify(r) === 'video') : []).map((video: any, idx: number) => (
              <Card key={video.id || video.title + idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Video className="w-12 h-12 text-primary" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm">{video.title}</h3>
                    <Badge variant="secondary" className="shrink-0">{video.level || ''}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{video.shortSummary || video.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{video.duration || ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{video.estimatedRating ?? video.rating ?? ''}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={() => { if (video.url) window.open(video.url, '_blank'); }}>
                    Watch Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Guides */}
        <TabsContent value="guides" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(results && results.length > 0 ? results.filter((r) => classify(r) === 'guide') : []).map((guide: any, idx: number) => (
              <Card key={guide.id || guide.title + idx} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex gap-4">
                  <div className="w-16 h-20 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm">{guide.title}</h3>
                      <Badge variant="secondary" className="shrink-0">{guide.level || ''}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{guide.shortSummary || guide.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{guide.pages ? `${guide.pages} pages` : ''}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { if (guide.url) window.open(guide.url, '_blank'); }}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => downloadViaProxy(guide.url)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}