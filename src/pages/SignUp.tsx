import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Field, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export function SignUp() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setSaving(false);
    setMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled.');
  }

  return (
    <AuthLayout title="Create your account" subtitle="Supabase Auth creates a private user identity for every record.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        {message ? <p className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">{message}</p> : null}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Creating...' : 'Sign up'}
        </Button>
      </form>
      <p className="mt-5 text-sm text-slate-600">
        Already have an account? <Link className="font-medium text-brand-700" to="/login">Login</Link>
      </p>
    </AuthLayout>
  );
}
