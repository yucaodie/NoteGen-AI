'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthBootstrap, PendingEmailConfirmation, SignUpResult } from '@supanotegen/shared';
import { signIn, signUp } from '../lib/auth';
import { saveStoredSession, saveStoredWorkspace } from '../lib/auth-storage';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="workspace-layout auth-shell">
      <div className="hero-card auth-card">
        <p className="eyebrow">Auth Gateway</p>
        <h1 className="workspace-heading">登录 SupaNoteGen 云端工作区</h1>
        <p className="workspace-subtitle hero-copy">
          当前阶段接入邮箱密码认证、会话恢复和默认工作区初始化。登录成功后会自动恢复你的云端知识库入口。
        </p>

        <div className="mode-switch" role="tablist" aria-label="认证方式">
          <button
            className={mode === 'sign-in' ? 'primary-button' : 'secondary-button'}
            type="button"
            onClick={() => setMode('sign-in')}
          >
            登录
          </button>
          <button
            className={mode === 'sign-up' ? 'primary-button' : 'secondary-button'}
            type="button"
            onClick={() => setMode('sign-up')}
          >
            注册
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setErrorMessage(null);
            setSuccessMessage(null);

            startTransition(async () => {
              try {
                const result = mode === 'sign-in' ? await signIn(email, password) : await signUp(email, password);

                if (isPendingEmailConfirmation(result)) {
                  setMode('sign-in');
                  setPassword('');
                  setSuccessMessage(result.message);
                  return;
                }

                const bootstrap = result;
                saveStoredSession(bootstrap.session);
                saveStoredWorkspace(bootstrap);
                router.push('/core/main');
                router.refresh();
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : '认证失败，请稍后重试。');
              }
            });
          }}
        >
          <label className="field-label">
            邮箱
            <input
              aria-label="邮箱"
              className="text-input"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field-label">
            密码
            <input
              aria-label="密码"
              className="text-input"
              name="password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位密码"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? '处理中...' : mode === 'sign-in' ? '进入工作区' : '创建账户'}
          </button>

          {successMessage ? <p className="feedback-banner success-banner">{successMessage}</p> : null}
          {errorMessage ? <p className="feedback-banner error-banner">{errorMessage}</p> : null}
        </form>
      </div>
    </section>
  );
}

function isPendingEmailConfirmation(result: AuthBootstrap | SignUpResult): result is PendingEmailConfirmation {
  return 'status' in result && result.status === 'pending_email_confirmation';
}
