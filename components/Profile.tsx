"use client";

import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { User, Mail, MapPin, Award, FileText, Settings, Bell, Shield, LogOut, Building } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, } from './ui/dialog';
import { Eye, EyeOff } from 'lucide-react';
import { Trash2, Eye as EyeIcon } from 'lucide-react';
import { ReportDetailsDialog } from './ReportDetailsDialog';
  
const userReports = [
  {
    id: 1,
    type: 'Deforestation',
    location: 'Amazon Basin, Brazil',
    date: '2024-01-10',
    status: 'verified',
    severity: 'high',
  },
  {
    id: 2,
    type: 'Illegal Logging',
    location: 'Amazon Basin, Brazil',
    date: '2024-01-08',
    status: 'investigating',
    severity: 'critical',
  },
  {
    id: 3,
    type: 'Forest Fire',
    location: 'Rondônia, Brazil',
    date: '2024-01-05',
    status: 'resolved',
    severity: 'high',
  },
];

// achievements will be loaded from the server for the current user (state set inside component)

export function Profile() {
  const [editMode, setEditMode] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    location: '',
    role: '',
  });
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    reportsSubmitted: 0,
    projectsFollowed: 0,
  });

  const [achievements, setAchievements] = useState<any[]>([]);
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  // helper to ensure achievements list has unique ids to avoid React key collisions
  const uniqAchievements = (arr: any[]) => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const a of arr || []) {
      const id = a?.id ?? JSON.stringify(a);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(a);
      }
    }
    return out;
  };
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const clickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // fetch achievement definitions for gallery
    fetch('/api/achievements')
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && Array.isArray(json.achievements)) setAllAchievements(json.achievements);
      })
      .catch(() => {});

    const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;
    if (!token) return;
    setLoading(true);
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.user) {
          // populate profile fields
          setFormData((prev) => ({
            ...prev,
            name: data.user.name || prev.name,
            email: data.user.email || prev.email,
            organization: data.user.organization || prev.organization,
            location: data.user.location || prev.location,
            role: data.user.role || prev.role,
          }));

          // populate stats
          setStats({
            reportsSubmitted: data.user.reportsSubmitted ?? 0,
            projectsFollowed: data.user.projectsFollowed ?? 0,
          });

          // populate achievements if present
          if (data.user.achievements && Array.isArray(data.user.achievements)) {
            setAchievements(uniqAchievements(data.user.achievements));
          }

          // If reportsSubmitted >= 1 and user doesn't have first_report, auto-award it
          const hasFirstReport = (data.user.achievements || []).some((a: any) => a.id === 'first_report');
          if ((data.user.reportsSubmitted ?? 0) >= 1 && !hasFirstReport) {
            // award via API; this endpoint is idempotent (will return already_awarded if duplicate)
            fetch('/api/achievements/award', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ achievementId: 'first_report' }),
            })
              .then((r) => r.json())
                  .then((res) => {
                if (res?.ok && res.achievement) {
                  setAchievements((prev) => uniqAchievements([...prev, res.achievement]));
                }
              })
              .catch(() => {});
          }

          // populate profile image if available
          // support either snake_case or camelCase from API
          const imgUrl = data.user.profile_image_url || data.user.profileImageUrl || null;
          if (imgUrl) {
            setProfileImage(imgUrl);
          }

          // populate notifications (default false)
          if (data.user.notifications) {
            setNotifications({
              emailAlerts: !!data.user.notifications.emailAlerts,
              criticalOnly: !!data.user.notifications.criticalOnly,
              weeklyReport: !!data.user.notifications.weeklyReport,
              projectUpdates: !!data.user.notifications.projectUpdates,
            });
          }
          // fetch recent reports for this user
          try {
            fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } })
              .then((r) => r.json())
              .then((rs) => {
                if (rs?.ok && Array.isArray(rs.reports)) {
                  setReports(rs.reports);
                  // If user has at least one report and achievements don't include first_report, optimistically add it
                  if ((rs.reports || []).length >= 1) {
                    const hasFirst = (data.user.achievements || []).some((a: any) => a.id === 'first_report');
                    if (!hasFirst) {
                      const alreadyLocal = achievements.some((a) => a.id === 'first_report');
                      if (!alreadyLocal) {
                        setAchievements((prev) => uniqAchievements([
                          ...prev,
                          { id: 'first_report', title: 'First Report', description: 'Submitted your first verified report', achievedAt: new Date().toISOString(), icon: '🌱' },
                        ]));
                      }
                    }
                  }
                 }
              })
              .catch(() => {});
          } catch (e) {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Listen for report updates dispatched by ReportForm and refetch profile data
  useEffect(() => {
    const handler = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;
      if (!token) return;
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data.user) {
            setStats((s) => ({ ...s, reportsSubmitted: data.user.reportsSubmitted ?? s.reportsSubmitted }));
            // refresh recent reports
            fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } })
              .then((r) => r.json())
              .then((rs) => {
                if (rs?.ok && Array.isArray(rs.reports)) setReports(rs.reports);
              })
              .catch(() => {});
            // update achievements state safely
            if (data.user.achievements && Array.isArray(data.user.achievements)) {
              setAchievements(uniqAchievements(data.user.achievements));
            }
          }
        })
        .catch(() => {});
    };
    window.addEventListener('fw:reports-updated', handler as EventListener);
    return () => window.removeEventListener('fw:reports-updated', handler as EventListener);
  }, []);

  // cleanup refs on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

  const [notifications, setNotifications] = useState({
    emailAlerts: false,
    criticalOnly: false,
    weeklyReport: false,
    projectUpdates: false,
  });
  // change password dialog state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
    setEditMode(false);
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    const newState = { ...notifications, [key]: !notifications[key] };
    // Optimistically update UI
    setNotifications(newState);

    const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notifications: newState }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.user && data.user.notifications) {
          setNotifications(data.user.notifications);
          toast.success('Notification preferences updated');
        } else {
          // revert on failure
          setNotifications(notifications);
          toast.error(data?.error || 'Failed to update notifications');
        }
      })
      .catch(() => {
        setNotifications(notifications);
        toast.error('Failed to update notifications');
      });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Picture Placeholder with upload */}
          <div
            className="relative w-24 h-24 cursor-pointer group"
            onMouseEnter={() => setIsHoveringAvatar(true)}
            onMouseLeave={() => setIsHoveringAvatar(false)}
            onClick={(e) => {
              if (removeConfirmOpen || isRemovingAvatar) return;
              // If there's already a pending click timeout, this is the second click -> treat as double-click
              if (clickTimeoutRef.current) {
                window.clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                // open confirm dialog for removal only if a profile image exists
                if (profileImage) {
                  setRemoveConfirmOpen(true);
                } else {
                  // no image yet — open the file chooser instead
                  document.getElementById('profile-image-upload')?.click();
                }
                return;
              }

              // schedule single-click action (open file chooser) after a short delay
              clickTimeoutRef.current = window.setTimeout(() => {
                document.getElementById('profile-image-upload')?.click();
                clickTimeoutRef.current = null;
              }, 400);
            }}
            onDoubleClick={(e) => {
              // extra guard: cancel pending single-click and open confirm
              if (clickTimeoutRef.current) {
                window.clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
              }
              e.preventDefault();
              e.stopPropagation();
              // Only open remove confirmation if there's an uploaded profile image
              if (profileImage) {
                setRemoveConfirmOpen(true);
              } else {
                // otherwise open file chooser
                document.getElementById('profile-image-upload')?.click();
              }
            }}
          >
            <Avatar key={profileImage ? profileImage : `initials-${formData.name || 'no-name'}`} className="w-24 h-24">
              {profileImage ? (
                  <AvatarImage src={profileImage} onError={() => setProfileImage(null)} />
                ) : (
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {
                    (formData.name || '')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0]?.toUpperCase())
                      .join('') || '?'
                  }
                </AvatarFallback>
              )}
            </Avatar>
            <div className={`absolute inset-0 bg-black/60 rounded-full flex items-center justify-center transition-opacity ${
              isHoveringAvatar ? 'opacity-100' : 'opacity-0'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                  toast.error('Please upload an image file');
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('Image size should be less than 5MB');
                  return;
                }

                // preview
                const reader = new FileReader();
                reader.onloadend = () => {
                  setProfileImage(reader.result as string);
                  toast.success('Profile picture updated (preview)');
                };
                reader.readAsDataURL(file);

                // upload to server
                try {
                  const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;
                  if (!token) {
                    toast.error('Not authenticated');
                    return;
                  }
                  const fd = new FormData();
                  fd.append('file', file, file.name);
                  const res = await fetch('/api/user/profile-image', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    toast.error(json?.error || 'Failed to upload');
                    return;
                  }
                    if (json?.url) {
                    setProfileImage(json.url);
                    toast.success('Profile picture updated successfully');
                    try {
                      const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                      const meJson = await meRes.json();
                      if (meJson?.ok && meJson.user) {
                        setFormData((prev) => ({
                          ...prev,
                          name: meJson.user.name || prev.name,
                          email: meJson.user.email || prev.email,
                          organization: meJson.user.organization || prev.organization,
                          location: meJson.user.location || prev.location,
                          role: meJson.user.role || prev.role,
                        }));
                        const img = meJson.user.profile_image_url || meJson.user.profileImageUrl || null;
                        setProfileImage(img);
                      }
                    } catch (e) {}
                  }
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error(err);
                  toast.error('Network error while uploading image');
                }
              }}
            />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
              <div>
                <h2 className="mb-1">{formData.name || 'Your name'}</h2>
                <p className="text-muted-foreground mb-2">{formData.role || '—'}</p>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      <Building className="w-3 h-3 mr-1" />
                      {formData.organization || '—'}
                    </Badge>
                    <Badge variant="outline">
                      <MapPin className="w-3 h-3 mr-1" />
                      {formData.location || '—'}
                    </Badge>
                  </div>
                </div>
                {/* Double-click avatar to remove picture — confirmation dialog below */}
                <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
                  <DialogContent hideClose onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                      <DialogTitle>Remove profile picture</DialogTitle>
                      <DialogDescription>Are you sure you want to remove your picture? This will revert to your name initials.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" className='cursor-pointer' onClick={() => setRemoveConfirmOpen(false)}>Cancel</Button>
                      </DialogClose>
                      <Button
                        className="bg-destructive cursor-pointer"
                        onClick={async () => {
                          setIsRemovingAvatar(true);
                          try {
                            const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;
                            if (!token) {
                              toast.error('Not authenticated');
                              setIsRemovingAvatar(false);
                              return;
                            }
                            const res = await fetch('/api/user/profile-image', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                            const json = await res.json();
                            if (!res.ok) {
                              toast.error(json?.error || 'Failed to remove profile image');
                              setIsRemovingAvatar(false);
                              return;
                            }
                            setProfileImage(null);
                            setRemoveConfirmOpen(false);
                            toast.success('Profile image removed');
                            try {
                              const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                              const meJson = await meRes.json();
                              if (meJson?.ok && meJson.user) {
                                setFormData((prev) => ({
                                  ...prev,
                                  name: meJson.user.name || prev.name,
                                  email: meJson.user.email || prev.email,
                                  organization: meJson.user.organization || prev.organization,
                                  location: meJson.user.location || prev.location,
                                  role: meJson.user.role || prev.role,
                                }));
                                const img = meJson.user.profile_image_url || meJson.user.profileImageUrl || null;
                                setProfileImage(img);
                              }
                            } catch (e) {}
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.error(err);
                            toast.error('Failed to remove profile image');
                          } finally {
                            setIsRemovingAvatar(false);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Logout button with confirmation dialog */}
                <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className='cursor-pointer' onClick={() => setLogoutOpen(true)}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </DialogTrigger>
                  <DialogContent hideClose onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                      <DialogTitle>Confirm Logout</DialogTitle>
                      <DialogDescription>Are you sure you want to log out? You will need to sign in again to access your dashboard.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" className='cursor-pointer' onClick={() => setLogoutOpen(false)}>Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={() => {
                          try {
                            localStorage.removeItem('fw_token');
                          } catch (e) {}
                          try {
                            sessionStorage.setItem('fw_toast', 'logged_out');
                          } catch (e) {}
                          window.location.reload();
                        }}
                        className="bg-destructive cursor-pointer"
                      >
                        Logout
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-muted-foreground mb-1">Reports</p>
                <h3 className="text-primary">{stats.reportsSubmitted}</h3>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Projects</p>
                <h3 className="text-primary">{stats.projectsFollowed}</h3>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity" className='cursor-pointer'>
            <FileText className="w-4 h-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings" className='cursor-pointer'>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="achievements" className='cursor-pointer'>
            <Award className="w-4 h-4 mr-2" />
            Achievements
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6 space-y-4">
          <Card className="p-6">
            <h3 className="mb-4">Recent Reports</h3>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="mb-2">No recent reports</h4>
                  <p className="text-sm">You haven't submitted any reports yet. Use the Report form to send your first report.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      report.severity === 'critical' ? 'bg-destructive' :
                      report.severity === 'high' ? 'bg-orange-500' :
                      'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm">{report.type || report.type}</h4>
                        <Badge variant={
                          (report.status === 'verified') ? 'default' :
                          (report.status === 'investigating') ? 'secondary' :
                          'outline'
                        }>
                          {report.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{report.location}</span>
                        <span>•</span>
                        <span>{report.created_at ? new Date(report.created_at).toLocaleString() : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedReport(report); setReportOpen(true); }} className="cursor-pointer">
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Report Details Dialog */}
        <ReportDetailsDialog
          report={selectedReport}
          open={reportOpen}
          onOpenChange={(open) => {
            setReportOpen(open);
            if (!open) setSelectedReport(null);
          }}
        />

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6 space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3>Profile Information</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!editMode}
                />
              </div>
              {editMode && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h3>Notification Preferences</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Email Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                </div>
                <Switch
                  className='cursor-pointer'
                  checked={notifications.emailAlerts}
                  onCheckedChange={() => handleNotificationChange('emailAlerts')}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Critical Alerts Only</p>
                  <p className="text-xs text-muted-foreground">Only receive critical severity alerts</p>
                </div>
                <Switch
                  className='cursor-pointer'
                  checked={notifications.criticalOnly}
                  onCheckedChange={() => handleNotificationChange('criticalOnly')}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Weekly Report</p>
                  <p className="text-xs text-muted-foreground">Get weekly summary of activities</p>
                </div>
                <Switch
                  className='cursor-pointer'
                  checked={notifications.weeklyReport}
                  onCheckedChange={() => handleNotificationChange('weeklyReport')}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Project Updates</p>
                  <p className="text-xs text-muted-foreground">Updates on followed projects</p>
                </div>
                <Switch
                  className='cursor-pointer'
                  checked={notifications.projectUpdates}
                  onCheckedChange={() => handleNotificationChange('projectUpdates')}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3>Privacy & Security</h3>
            </div>
            <div className="space-y-3">
              <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent hideClose onInteractOutside={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>Enter your current password and enter a new one.</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const fd = new FormData(form);
                      const currentPassword = String(fd.get('currentPassword') || '').trim();
                      const newPassword = String(fd.get('newPassword') || '').trim();
                      const confirm = String(fd.get('confirmPassword') || '').trim();
                      if (!currentPassword || !newPassword) {
                        toast.error('Please provide both current and new passwords');
                        return;
                      }
                      if (newPassword !== confirm) {
                        toast.error('New password and confirmation do not match');
                        return;
                      }

                      try {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;
                        if (!token) {
                          toast.error('Not authenticated');
                          return;
                        }
                        const res = await fetch('/api/auth/change-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ currentPassword, newPassword }),
                        });
                        const json = await res.json();
                        if (res.ok && json?.ok) {
                          toast.success('Password changed');
                          // automatically close dialog on success
                          setChangePasswordOpen(false);
                        } else {
                          toast.error(json?.error || 'Failed to change password');
                        }
                      } catch (err) {
                        toast.error('Failed to change password');
                      }
                    }}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input id="currentPassword" name="currentPassword" type={showCurrent ? 'text' : 'password'} required className="pl-3 pr-10" />
                          <button type="button" aria-label={showCurrent ? 'Hide current password' : 'Show current password'} onClick={() => setShowCurrent((s) => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center justify-center">
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input id="newPassword" name="newPassword" type={showNew ? 'text' : 'password'} required className="pl-3 pr-10" />
                          <button type="button" aria-label={showNew ? 'Hide new password' : 'Show new password'} onClick={() => setShowNew((s) => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center justify-center">
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'} required className="pl-3 pr-10" />
                          <button type="button" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center justify-center">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Change Password</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="w-full justify-start">
                Two-Factor Authentication
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Data & Privacy Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-6">
          <Card className="p-6">
            <h3 className="mb-4">Your Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="flex gap-4 p-4 rounded-lg border border-border">
                      <div className="text-4xl">{achievement.icon || '🏅'}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="mb-1">{achievement.title}</h4>
                          {achievement.achievedAt ? (
                            <span className="text-xs text-muted-foreground">{new Date(achievement.achievedAt).toLocaleString()}</span>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Card className="p-6 mt-4">
                  <h4 className="mb-3">All Achievements</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {allAchievements.map((a) => {
                      const earned = achievements.some((ea) => ea.id === a.id);
                      return (
                        <div key={a.id} className={`p-3 rounded-lg border ${earned ? 'bg-white' : 'bg-muted/10 opacity-60'} flex items-start gap-3`}>
                          <div className="text-2xl">{a.icon || '🏅'}</div>
                          <div>
                            <div className="text-sm font-medium">{a.title}</div>
                            <div className="text-xs text-muted-foreground">{a.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
