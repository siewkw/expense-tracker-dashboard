import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Field, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    setSaving(false);
    setMessage(error ? error.message : 'Password reset email sent.');
  }

  return (
    <AuthLayout title="Reset password" subtitle="We will send a secure reset link to your email address.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        {message ? <p className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">{message}</p> : null}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-5 text-sm text-slate-600">
        Remembered it? <Link className="font-medium text-brand-700" to="/login">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
