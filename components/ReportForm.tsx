import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { MapPin, Upload, Send, Image as ImageIcon } from 'lucide-react';

export function ReportForm() {
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    latitude: '',
    longitude: '',
    description: '',
    severity: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<Array<{ url: string; filename?: string }>>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.location || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Submit to server: create the report first, then upload images to /api/report-images
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;

        // create report (JSON POST)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: formData.type,
            location: formData.location,
            description: formData.description,
            severity: formData.severity || null,
            latitude: formData.latitude || null,
            longitude: formData.longitude || null,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          console.error('Report creation error', json);
          toast.error(json?.error || 'Failed to create report');
          return;
        }

        const reportId = json.report?.id;

        // If there are images, upload them to the new endpoint via multipart
        if (images.length > 0 && reportId) {
          const uploadForm = new FormData();
          uploadForm.append('reportId', reportId);
          images.forEach((img) => uploadForm.append('images', img));
          const upRes = await fetch('/api/report-images', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: uploadForm,
          });
          const upJson = await upRes.json();
          if (!upRes.ok || !upJson?.ok) {
            // images failed but report created — show non-fatal warning
            console.warn('Image upload warning', upJson);
            toast.error('Report created but some images failed to upload');
          } else {
            // Use returned signed URLs to show immediate previews
            const urls: string[] = Array.isArray(upJson.signedUrls) ? upJson.signedUrls : [];
            const imgsMeta: any[] = Array.isArray(upJson.images) ? upJson.images : [];
            const previews = urls.map((u, i) => ({ url: u, filename: imgsMeta[i]?.filename || '' }));
            setUploadedPreviews(previews);
            // clear selected files but keep previews visible to user
            setImages([]);
          }
        }

        toast.success('Report submitted successfully! Our team will review it shortly.');

        // Reset form fields but keep uploaded previews visible
        setFormData({
          type: '',
          location: '',
          latitude: '',
          longitude: '',
          description: '',
          severity: '',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        toast.error('Failed to submit report');
      }
    })();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      setImages([...images, ...newImages]);
      toast.success(`${newImages.length} image(s) added`);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
          toast.success('Location captured successfully');
        },
        () => {
          toast.error('Unable to get your location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-primary mb-2">Submit a Report</h1>
        <p className="text-muted-foreground">
          Report deforestation, illegal logging, or other forest-related incidents
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Report Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger id="type" className='cursor-pointer'>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {/* Static report types removed to prepare for dynamic loading.
                    Keep these commented here as a guide for future data seed:

                <SelectItem value="Deforestation" className='cursor-pointer'>Deforestation</SelectItem>
                <SelectItem value="Illegal Logging" className='cursor-pointer'>Illegal Logging</SelectItem>
                <SelectItem value="Forest-fire" className='cursor-pointer'>Forest Fire</SelectItem>
                <SelectItem value="Land-clearing" className='cursor-pointer'>Land Clearing</SelectItem>
                <SelectItem value="Wildlife-threat" className='cursor-pointer'>Wildlife Threat</SelectItem>
                <SelectItem value="Pollution" className='cursor-pointer'>Pollution</SelectItem>
                <SelectItem value="Other" className='cursor-pointer'>Other</SelectItem>

                */}
                <SelectItem value="__no_types_loaded" disabled className='cursor-default'>No report types loaded (will be fetched dynamically)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity">Severity *</Label>
            <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
              <SelectTrigger id="severity" className='cursor-pointer'>
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                {/* Severity options commented out to allow dynamic provisioning later
                <SelectItem value="low" className='cursor-pointer'>Low - Minor concern</SelectItem>
                <SelectItem value="medium" className='cursor-pointer'>Medium - Needs attention</SelectItem>
                <SelectItem value="high" className='cursor-pointer'>High - Urgent action required</SelectItem>
                <SelectItem value="critical" className='cursor-pointer'>Critical - Emergency</SelectItem>
                */}
                <SelectItem value="__no_severity_loaded" disabled className='cursor-default'>Severity levels not loaded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location Description *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Amazon Basin, near Vila do Carmo"
            />
          </div>

          {/* GPS Coordinates */}
          <div className="space-y-2">
            <Label>GPS Coordinates</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="Latitude (e.g., -3.4653)"
              />
              <Input
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="Longitude (e.g., -62.2159)"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} className="mt-2 cursor-pointer">
              <MapPin className="w-4 h-4 mr-2" />
              Use Current Location
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information about what you observed..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Include details like date/time observed, extent of damage, any suspicious activity, etc.
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="images">Upload Photos (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="images" className="cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm mb-1">Click to upload images</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB each</p>
              </label>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {images.map((image, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm">{image.name}</span>
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== index))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

              {/* Uploaded previews (signed URLs returned from server) */}
              {uploadedPreviews.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2">Uploaded Images</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {uploadedPreviews.map((p, i) => (
                      <div key={i} className="relative bg-muted rounded overflow-hidden">
                        <img src={p.url} alt={p.filename || `image-${i}`} className="w-full h-24 object-cover" />
                        <div className="p-1 text-xs text-muted-foreground">{p.filename}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <button type="button" onClick={() => setUploadedPreviews([])} className="text-sm text-muted-foreground hover:underline">
                      Dismiss previews
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" className="flex-1 justify-center cursor-pointer">
              <Send className="w-4 h-4 mr-2" />
              Submit Report
            </Button>
            <Button
              className='cursor-pointer'
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  type: '',
                  location: '',
                  latitude: '',
                  longitude: '',
                  description: '',
                  severity: '',
                });
                setImages([]);
              }}
            >
              Clear Form
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <span className="text-primary">Note:</span> All reports are reviewed by our team. 
              Verified reports will be escalated to relevant authorities and NGOs. False reports may result in account suspension.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
