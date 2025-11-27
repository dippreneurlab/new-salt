'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandedHeader from './BrandedHeader';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebaseClient';

interface LoginProps {
  onLogin: (userData: { email: string; name: string; role: 'admin' | 'pm' | 'user' }) => void;
  onShowSignUp: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => string;
      reset: (id?: string) => void;
    };
  }
}

export default function Login({ onLogin, onShowSignUp }: LoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Load Cloudflare Turnstile script
  useEffect(() => {
    if (!turnstileSiteKey) return;

    const onReady = () => setTurnstileReady(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );

    if (existing) {
      if (window.turnstile) {
        onReady();
      } else {
        existing.addEventListener('load', onReady, { once: true });
        return () => existing.removeEventListener('load', onReady);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', onReady, { once: true });
    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', onReady);
    };
  }, [turnstileSiteKey]);

  // Render Turnstile widget once ready
  useEffect(() => {
    if (!turnstileReady || !turnstileSiteKey || !turnstileRef.current || !window.turnstile) return;
    if (turnstileWidgetId.current !== null) return;

    turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => {
        setTurnstileToken(token);
        setErrors(prev => ({ ...prev, recaptcha: '' }));
      },
      'expired-callback': () => {
        setTurnstileToken('');
        setErrors(prev => ({ ...prev, recaptcha: 'Captcha expired, please try again.' }));
      },
      'timeout-callback': () => {
        setTurnstileToken('');
        setErrors(prev => ({ ...prev, recaptcha: 'Captcha timed out, please try again.' }));
      },
      'error-callback': () => {
        setTurnstileToken('');
        setErrors(prev => ({ ...prev, recaptcha: 'Captcha failed to load. Please refresh and try again.' }));
      }
    });
  }, [turnstileReady, turnstileSiteKey]);

  const resetTurnstile = () => {
    if (turnstileWidgetId.current && window.turnstile?.reset) {
      window.turnstile.reset(turnstileWidgetId.current);
      setTurnstileToken('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);
    setErrors({});
    
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (turnstileSiteKey && !turnstileToken) {
      newErrors.recaptcha = turnstileReady
        ? 'Please complete the captcha'
        : 'Captcha is still loading, please wait a moment';
    }
    
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.recaptcha) resetTurnstile();
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getClientAuth();
      if (!auth) {
        throw new Error('Firebase auth not configured');
      }
      const credential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const authedUser = credential.user;
      const token = await authedUser.getIdTokenResult(true);
      const roleClaim = (token.claims.role as string) || 'user';
      const name = authedUser.displayName || authedUser.email?.split('@')[0] || 'User';
      onLogin({
        email: authedUser.email || formData.email,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        role: roleClaim as 'admin' | 'pm' | 'user'
      });
    } catch (err) {
      console.error('Firebase sign-in failed', err);
      setFormError('Unable to sign in. Check your credentials and try again.');
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandedHeader />
      
      <div className="flex items-center justify-center pt-20">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
              <CardDescription>Sign in to access SaltPM</CardDescription>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {turnstileSiteKey ? (
                <div className="space-y-2">
                  <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                    <div ref={turnstileRef} className="flex justify-center" />
                  </div>
                  {errors.recaptcha && (
                    <p className="text-sm text-red-600">{errors.recaptcha}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-600">
                  Turnstile key missing. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable bot protection.
                </p>
              )}

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">New to Salt XC?</span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={onShowSignUp}
              >
                Create New Account
              </Button>
              
              <p className="text-xs text-gray-500">
                Login with your Salt Email
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
