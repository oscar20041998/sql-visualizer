'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import {
  setDemoAuthenticated,
  setSocialSession,
  type AuthUIState,
  type OAuthCallbackPayload,
} from '@/lib/demoAuth';
import { buildOAuthUrl, createOAuthState } from '@/lib/oauthUtils';
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  PanelsTopLeft,
  UserRoundPlus,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

/**
 * Sign-in form panel extracted from the former home-page sidebar.
 * Behaviour is preserved verbatim (demo admin credentials, register stub,
 * OAuth popup flow) — only presentation is upgraded (typography, spacing,
 * state affordances) per specs/006-login-ui-redesign (FR-001..FR-006, FR-009).
 */
export default function SignInPanel() {
  const router = useRouter();
  const { settings, beginNavigation } = useAppStore();
  const t = getT(settings.locale as 'en' | 'vi');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [authState, setAuthState] = useState<AuthUIState>('idle');
  const [authError, setAuthError] = useState('');
  const pendingAuthRef = useRef<{ provider: 'google' | 'microsoft'; state: string } | null>(null);

  const finishSocialLogin = async (
    provider: 'google' | 'microsoft',
    expectedState: string,
    payload: OAuthCallbackPayload
  ) => {
    if (payload.state !== expectedState) {
      const message = t.authSocialLoginFailed.replace('{error}', 'invalid OAuth state');
      setAuthState('error');
      setAuthError(message);
      toast.error(message);
      return;
    }
    if (payload.error || !payload.accessToken) {
      const message = payload.errorDescription || payload.error || t.authSocialLoginCancelled;
      setAuthState('error');
      setAuthError(message);
      toast.error(payload.error ? t.authSocialLoginFailed.replace('{error}', message) : message);
      return;
    }

    try {
      const profile =
        payload.profile ||
        (await fetch(
          provider === 'google'
            ? 'https://www.googleapis.com/oauth2/v3/userinfo'
            : 'https://graph.microsoft.com/v1.0/me',
          { headers: { Authorization: `Bearer ${payload.accessToken}` } }
        ).then((response) => (response.ok ? response.json() : null)));
      const displayName = profile?.name || profile?.displayName;
      const email = profile?.email || profile?.mail || profile?.userPrincipalName;
      if (!displayName || !email) throw new Error('profile unavailable');
      setSocialSession({
        provider,
        displayName,
        email,
        avatarUrl: profile.picture,
        accessToken: payload.accessToken,
        expiry: Date.now() + (payload.expiresIn || 3600) * 1000,
      });
      setAuthState('idle');
      toast.success(
        t.authSocialLoginSuccess
          .replace('{provider}', provider === 'google' ? 'Google' : 'Microsoft')
          .replace('{name}', displayName)
      );
      beginNavigation('/query-input');
      router.push('/query-input');
    } catch {
      const message = t.authSocialLoginFailed.replace('{error}', 'profile unavailable');
      setAuthState('error');
      setAuthError(message);
      toast.error(message);
    }
  };

  const startSocialLogin = (provider: 'google' | 'microsoft') => {
    const state = createOAuthState();
    pendingAuthRef.current = { provider, state };
    setAuthState('authenticating');
    setAuthError('');
    const clientId =
      provider === 'google'
        ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        : process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
    const popupUrl = clientId
      ? buildOAuthUrl({
          clientId,
          authUrl:
            provider === 'google'
              ? 'https://accounts.google.com/o/oauth2/v2/auth'
              : 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          redirectUri: `${window.location.origin}/oauth/callback?provider=${provider}`,
          scopes: ['openid', 'profile', 'email'],
          state,
        })
      : `/oauth/mock-popup.html?provider=${provider}&state=${encodeURIComponent(state)}`;
    const popup = window.open(popupUrl, 'sql-visualizer-oauth', 'popup,width=480,height=640');
    if (!popup) {
      pendingAuthRef.current = null;
      setAuthState('error');
      setAuthError('Allow Popups to continue signing in.');
      toast.error('Allow Popups to continue signing in.');
      return;
    }
    const poll = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(poll);
      if (pendingAuthRef.current?.state === state) {
        pendingAuthRef.current = null;
        setAuthState('error');
        setAuthError(t.authSocialLoginCancelled);
        toast.info(t.authSocialLoginCancelled);
      }
    }, 400);
  };

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'oauth-callback') return;
      const pending = pendingAuthRef.current;
      if (!pending || (event.data.provider && event.data.provider !== pending.provider)) return;
      pendingAuthRef.current = null;
      void finishSocialLogin(pending.provider, pending.state, event.data.payload);
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  });

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (username.trim() !== 'admin' || password !== '1234@') {
      setAuthState('error');
      setAuthError(t.authLoginInvalidCredentials);
      toast.error(t.authLoginInvalidCredentials);
      return;
    }

    setAuthState('idle');
    setAuthError('');
    setDemoAuthenticated();
    toast.success(t.authLoginSuccess);
    beginNavigation('/query-input');
    router.push('/query-input');
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.info(t.authRegisterUnavailable);
  };

  // Splits the localized notice on {username}/{password} tokens so the credentials stay styled.
  const noticeParts = t.authTemporaryAccessNotice.split(/(\{username\}|\{password\})/g);

  const isBusy = authState === 'authenticating';

  const controlClass =
    'h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring';

  const tabClass = (active: boolean) =>
    `h-10 flex-1 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
    }`;

  const socialButtonClass =
    'h-10 flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section aria-labelledby="sign-in-heading" className="w-full max-w-md">
      {/* Mode tabs (behaviour preserved: login / register switch only) */}
      <div
        role="tablist"
        aria-label={t.authModeTabsLabel}
        className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1"
      >
        <button
          type="button"
          role="tab"
          id="tab-login"
          aria-selected={mode === 'login'}
          aria-controls="panel-login"
          className={tabClass(mode === 'login')}
          onClick={() => setMode('login')}
        >
          {t.authTabLogin}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-register"
          aria-selected={mode === 'register'}
          aria-controls="panel-register"
          className={tabClass(mode === 'register')}
          onClick={() => setMode('register')}
        >
          {t.authTabRegister}
        </button>
      </div>

      <h1 id="sign-in-heading" className="text-2xl font-semibold tracking-tight text-foreground">
        {t.authWorkspaceAccessTitle}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.authWorkspaceAccessSubtitle}</p>

      {mode === 'login' ? (
        <div id="panel-login" role="tabpanel" aria-labelledby="tab-login">
          <form onSubmit={handleLogin} noValidate>
          <div className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="block text-sm font-medium text-foreground">
                {t.authUsernameLabel}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Mail size={15} aria-hidden="true" />
                </span>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder={t.authUsernamePlaceholder}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={`${controlClass} pl-9`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
                {t.authPasswordLabel}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <KeyRound size={15} aria-hidden="true" />
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t.authPasswordPlaceholder}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${controlClass} pl-9 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {authState === 'error' && authError ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{authError}</span>
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isBusy}
              className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.authLoginButton}
            </button>
          </div>
          </form>
        </div>
      ) : (
        <div id="panel-register" role="tabpanel" aria-labelledby="tab-register">
          <form onSubmit={handleRegister} noValidate>
          <div className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="block text-sm font-medium text-foreground">
                {t.authEmailLabel}
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t.authEmailPlaceholder}
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                className={controlClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="block text-sm font-medium text-foreground">
                {t.authCreatePasswordLabel}
              </label>
              <input
                id="register-password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.authCreatePasswordPlaceholder}
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                className={controlClass}
              />
            </div>
            <button
              type="submit"
              className="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t.authRegisterButton}
            </button>
          </div>
          </form>
        </div>
      )}


      {/* Social sign-in (behaviour preserved verbatim) */}
      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t.authOrContinueWith}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className={socialButtonClass}
          disabled={isBusy}
          onClick={() => startSocialLogin('google')}
        >
          {isBusy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Globe2 size={15} aria-hidden="true" />}
          {t.authGoogleButton}
        </button>
        <button
          type="button"
          className={socialButtonClass}
          disabled={isBusy}
          onClick={() => startSocialLogin('microsoft')}
        >
          {isBusy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <PanelsTopLeft size={15} aria-hidden="true" />}
          {t.authMicrosoftButton}
        </button>
      </div>


      {/* Temporary credentials notice — localized, tokens styled */}
      <p className="mt-6 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
        <LockKeyhole size={14} className="mr-1.5 inline-block align-[-2px]" aria-hidden="true" />
        {noticeParts.map((part, index) =>
          part === '{username}' ? (
            <code key={index} className="rounded bg-background px-1 py-0.5 font-medium text-foreground">
              admin
            </code>
          ) : part === '{password}' ? (
            <code key={index} className="rounded bg-background px-1 py-0.5 font-medium text-foreground">
              1234@
            </code>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          )
        )}
      </p>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowUpRight size={13} aria-hidden="true" />
        {t.authSignInPrompt}
      </p>
    </section>
  );
}
