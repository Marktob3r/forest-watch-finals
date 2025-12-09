import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Trees, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single character
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = () => {
    (async () => {
      const code = verificationCode.join('');
      if (code.length !== 6) {
        toast.error('Please enter the complete verification code');
        return;
      }
      try {
        setIsVerifying(true);
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.reason || json?.error || 'Verification failed');
          setIsVerifying(false);
          return;
        }
        // store token and proceed
        if (json.token) localStorage.setItem('fw_token', json.token);
        toast.success('Email verified! Redirecting...');
        setTimeout(() => onVerified(), 600);
      } catch (err) {
        toast.error('Network error while verifying');
      } finally {
        setIsVerifying(false);
      }
    })();
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || 'Failed to resend code');
      } else {
        toast.success('Verification code resent to your email');
        // start 30s cooldown
        setResendCooldown(30);
      }
    } catch (err) {
      toast.error('Network error while resending code');
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    // focus first input on mount
    const first = document.getElementById('code-0') as HTMLInputElement | null;
    first?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').trim();
    if (!/^[0-9]{6}$/.test(text)) return;
    const parts = text.split('');
    setVerificationCode(parts);
    const last = document.getElementById('code-5');
    last?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to signup
        </button>

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-primary mb-2">Check Your Email</h1>
          <p className="text-muted-foreground">
            We've sent a verification code to
          </p>
          <p className="text-foreground mt-1">{email}</p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-center block">Enter Verification Code</Label>
              <div className="flex gap-2 justify-center">
                {verificationCode.map((digit, index) => (
                  <Input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    autoFocus={index === 0 ? true : undefined}
                    className="w-12 h-12 text-center text-lg"
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={verificationCode.join('').length !== 6 || isVerifying}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className="text-primary"
              >
                {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 bg-primary/5 border border-primary/10 rounded-lg p-4">
          <div className="flex gap-3">
            <Trees className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-foreground mb-1">Almost there!</p>
              <p className="text-muted-foreground">
                Verify your email to start monitoring and protecting forests with Forest Watch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
