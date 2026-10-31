import { useState, type FormEvent } from 'react';
import { ApiError, requestOtp, verifyOtp } from '../api';
import { Header } from './Header';

/** Turns "98000 00002" or "+91 98000 00002" into E.164, assuming India
 * when no country code is typed. */
function toE164(input: string): string {
  const trimmed = input.replace(/[\s-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  return `+91${trimmed.replace(/^0/, '')}`;
}

export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (step === 'phone') {
        await requestOtp(toE164(phone));
        setStep('code');
      } else {
        await verifyOtp(toE164(phone), code.trim());
        onSignedIn();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="login-wrap">
        <form className="card login-card" onSubmit={submit}>
          <h1>Log in</h1>
          <p className="muted">
            {step === 'phone'
              ? 'Use the phone number set up as an admin.'
              : `Enter the 6-digit code sent to ${toE164(phone)}.`}
          </p>

          {step === 'phone' ? (
            <label className="field">
              <span>Phone number</span>
              <div className="phone-input">
                <span>+91</span>
                <input
                  autoFocus
                  inputMode="tel"
                  placeholder="98000 00002"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </label>
          ) : (
            <label className="field">
              <span>Code</span>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button wide" disabled={busy}>
            {busy ? 'Please wait…' : step === 'phone' ? 'Send code' : 'Log in'}
          </button>
          {step === 'code' && (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
            >
              Use a different number
            </button>
          )}
        </form>
      </main>
    </>
  );
}
