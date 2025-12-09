import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Trees, Mail, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
  modal?: boolean;
}

type Step = 'email' | 'code' | 'reset' | 'success';

export function ForgotPassword({ onBack, onSuccess, modal = false }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || 'Failed to send reset code');
        setIsLoading(false);
        return;
      }
      toast.success('Reset code sent to your email');
      setStep('code');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...resetCode];
    newCode[index] = value;
    setResetCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !resetCode[index] && index > 0) {
      const prevInput = document.getElementById(`reset-code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyCode = () => {
    const code = resetCode.join('');
    
    if (code.length !== 6) {
      toast.error('Please enter the complete reset code');
      return;
    }

    // call verify endpoint
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          toast.error(json?.reason || json?.error || 'Invalid code');
          return;
        }
        toast.success('Code verified!');
        setStep('reset');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        toast.error('Network error');
      }
    })();
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    (async () => {
      try {
        const code = resetCode.join('');
        const res = await fetch('/api/auth/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, password: newPassword }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          toast.error(json?.reason || json?.error || 'Failed to reset password');
          return;
        }
        toast.success('Password reset successfully!');
        setStep('success');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        toast.error('Network error');
      }
    })();
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || 'Failed to resend');
        return;
      }
      toast.success('Reset code resent to your email');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const wrapperClass = modal
    ? 'w-full'
    : 'min-h-screen flex items-center justify-center px-4 py-8';

  const innerClass = modal ? 'w-full' : 'w-full max-w-md';

  return (
    <div className={wrapperClass}>
      <div className={innerClass}>
        {/* Back button (goes to previous step or closes modal) */}
        {step !== 'success' && (
          <button
            onClick={() => {
              if (step === 'email') return onBack();
              if (step === 'code') return setStep('email');
              if (step === 'reset') return setStep('code');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'email' ? 'Back to login' : 'Back'}
          </button>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-primary mb-2">Reset Password</h1>
              <p className="text-muted-foreground">
                Enter your email address and we'll send you a code to reset your password
              </p>
            </div>

            <Card className="p-8">
              <form onSubmit={handleSendCode} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Code'}
                </Button>
              </form>
            </Card>
          </>
        )}

        {/* Code Verification Step */}
        {step === 'code' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-primary mb-2">Enter Reset Code</h1>
              <p className="text-muted-foreground">
                We've sent a 6-digit code to
              </p>
              <p className="text-foreground mt-1">{email}</p>
            </div>

            <Card className="p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-center block">Reset Code</Label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {resetCode.map((digit, index) => (
                      <Input
                        key={index}
                        id={`reset-code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="sm:w-12 w-10 h-12 text-center text-lg"
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleVerifyCode}
                  className="w-full"
                  disabled={resetCode.join('').length !== 6}
                >
                  Verify Code
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Didn't receive the code?
                  </p>
                  <Button
                    variant="ghost"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-primary"
                  >
                    {isLoading ? 'Sending...' : 'Resend Code'}
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Reset Password Step */}
        {step === 'reset' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-primary mb-2">Create New Password</h1>
              <p className="text-muted-foreground">
                Enter a new password for your account
              </p>
            </div>

            <Card className="p-8">
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center justify-center"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Reset Password
                </Button>
              </form>
            </Card>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-primary mb-2">Password Reset Complete</h1>
              <p className="text-muted-foreground">
                Your password has been successfully reset
              </p>
            </div>

            <Card className="p-8">
              <div className="space-y-6">
                <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Trees className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-foreground mb-1">You're all set!</p>
                      <p className="text-muted-foreground">
                        You can now sign in with your new password to access Forest Watch.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={onSuccess} className="w-full">
                  Return to Login
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
