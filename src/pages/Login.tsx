import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Field, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSaving(false);
    if (error) setMessage(error.message);
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your private finance workspace.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        {message ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Logging in...' : 'Login'}
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link className="font-medium text-brand-700" to="/sign-up">Create account</Link>
        <Link className="font-medium text-brand-700" to="/forgot-password">Forgot password?</Link>
      </div>
    </AuthLayout>
  );
}
