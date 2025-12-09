"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from './ui/dialog';
import { Button } from './ui/button';

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'terms' | 'privacy';
}

export function TermsDialog({ open, onOpenChange, initialTab = 'terms' }: TermsDialogProps) {
  const [tab, setTab] = React.useState<'terms' | 'privacy'>(initialTab);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose onEscapeKeyDown={(e: any) => { try { e.preventDefault(); } catch {} }} onPointerDownOutside={(e: any) => { try { e.preventDefault(); } catch {} }}>
        <DialogHeader>
          <DialogTitle>{tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</DialogTitle>
          <DialogDescription>
            {tab === 'terms' ? 'Please review our Terms of Service.' : 'Please review our Privacy Policy.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`px-3 py-1 rounded ${tab === 'terms' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => setTab('privacy')}
            className={`px-3 py-1 rounded ${tab === 'privacy' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Privacy
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-auto pb-4">
          {tab === 'terms' ? (
            <div>
              <h4 className="font-semibold">1. Acceptance</h4>
              <p className="text-sm text-muted-foreground">By creating an account and using Forest Watch, you agree to these Terms of Service. If you do not agree, do not use the service.</p>

              <h4 className="font-semibold mt-3">2. Use of Service</h4>
              <p className="text-sm text-muted-foreground">Forest Watch provides satellite imagery, monitoring tools, and community features to support forest conservation. You agree to use the service in accordance with applicable law and not to misuse or interfere with the platform.</p>

              <h4 className="font-semibold mt-3">3. User Content</h4>
              <p className="text-sm text-muted-foreground">You retain ownership of content you submit (reports, photos, annotations). By submitting content you grant Forest Watch a worldwide, royalty-free license to host, display, and use the content to operate and improve the service.</p>

              <h4 className="font-semibold mt-3">4. Prohibited Conduct</h4>
              <p className="text-sm text-muted-foreground">Do not submit false reports, harass others, or attempt to reverse-engineer or disrupt the service. Accounts used for abuse may be suspended.</p>

              <h4 className="font-semibold mt-3">5. Modifications & Termination</h4>
              <p className="text-sm text-muted-foreground">We may modify or discontinue features at any time. We may terminate accounts that violate these terms or for operational reasons.</p>

              <h4 className="font-semibold mt-3">6. Liability</h4>
              <p className="text-sm text-muted-foreground">To the fullest extent allowed by law, Forest Watch is provided "as is" and we disclaim certain warranties. Our liability is limited as described in the full terms.</p>

              <p className="text-xs text-muted-foreground mt-4">These are summary terms intended for development and demonstration only.</p>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold">1. Information We Collect</h4>
              <p className="text-sm text-muted-foreground">We collect account information (name, email), reports and images you submit, location information you provide, and technical data such as IP address and device information.</p>

              <h4 className="font-semibold mt-3">2. How We Use Data</h4>
              <p className="text-sm text-muted-foreground">We use data to operate and improve Forest Watch, provide monitoring features, send transactional emails, and to detect abuse. We may aggregate data for research and reporting purposes in a non-identifying way.</p>

              <h4 className="font-semibold mt-3">3. Sharing & Third Parties</h4>
              <p className="text-sm text-muted-foreground">We do not sell personal data. We may share data with service providers (hosting, email) under contract. Public reports and aggregated statistics may be visible to other users.</p>

              <h4 className="font-semibold mt-3">4. Security</h4>
              <p className="text-sm text-muted-foreground">We take reasonable measures to protect your data but cannot guarantee absolute security. If a breach occurs we will follow applicable notification requirements.</p>

              <h4 className="font-semibold mt-3">5. Your Choices</h4>
              <p className="text-sm text-muted-foreground">You can update or delete your account data through the profile page. You may opt out of marketing emails; transactional messages are required for account operation.</p>

              <p className="text-xs text-muted-foreground mt-4">This privacy summary is for demonstration only.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex-1 text-sm text-muted-foreground">Last updated: Nov 2025</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TermsDialog;
