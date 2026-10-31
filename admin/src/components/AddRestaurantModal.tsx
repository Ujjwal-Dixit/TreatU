import { useState, type FormEvent } from 'react';
import { ApiError, createRestaurant, type AdminRestaurant } from '../api';
import { Modal } from './Modal';

interface Props {
  onClose: () => void;
  onAdded: (restaurant: AdminRestaurant) => void;
}

const PRICE_TIERS = [
  { value: 1, label: '₹ · Budget' },
  { value: 2, label: '₹₹ · Moderate' },
  { value: 3, label: '₹₹₹ · Premium' },
  { value: 4, label: '₹₹₹₹ · Fine dining' },
];

/** Accepts the "21.1458, 79.0882" pair Google Maps copies when you
 * right-click a spot, so nobody has to split it by hand. */
function parseCoordinates(input: string): { latitude: number; longitude: number } | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function toE164(input: string): string | undefined {
  const trimmed = input.replace(/[\s-]/g, '');
  if (!trimmed) return undefined;
  return trimmed.startsWith('+') ? trimmed : `+91${trimmed.replace(/^0/, '')}`;
}

export function AddRestaurantModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    name: '',
    area: '',
    streetAddress: '',
    cuisines: '',
    priceTier: 2,
    coordinates: '',
    coverImageUrl: '',
    description: '',
    ownerPhone: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof typeof form) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const coordinates = parseCoordinates(form.coordinates);
    if (!coordinates) {
      setError('Location must look like "21.1458, 79.0882" (latitude, longitude).');
      return;
    }
    const cuisines = form.cuisines
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cuisines.length === 0) {
      setError('Add at least one cuisine.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await createRestaurant({
        name: form.name.trim(),
        area: form.area.trim(),
        streetAddress: form.streetAddress.trim(),
        cuisines,
        priceTier: Number(form.priceTier),
        ...coordinates,
        coverImageUrl: form.coverImageUrl.trim(),
        description: form.description.trim() || undefined,
        ownerPhoneNumber: toE164(form.ownerPhone),
      });
      onAdded(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <Modal title="Add restaurant" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="form-grid">
          <label className="field span-2">
            <span>Restaurant name</span>
            <input autoFocus required maxLength={120} value={form.name} onChange={set('name')} />
          </label>
          <label className="field">
            <span>Area</span>
            <input required maxLength={40} placeholder="Dharampeth" value={form.area} onChange={set('area')} />
          </label>
          <label className="field">
            <span>Price</span>
            <select value={form.priceTier} onChange={set('priceTier')}>
              {PRICE_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field span-2">
            <span>Street address</span>
            <input
              required
              maxLength={160}
              placeholder="21 West High Court Road"
              value={form.streetAddress}
              onChange={set('streetAddress')}
            />
          </label>
          <label className="field span-2">
            <span>Cuisines</span>
            <input
              required
              placeholder="Cafe, Continental"
              value={form.cuisines}
              onChange={set('cuisines')}
            />
            <small>Separate with commas, up to 6.</small>
          </label>
          <label className="field span-2">
            <span>Location</span>
            <input
              required
              placeholder="21.1458, 79.0882"
              value={form.coordinates}
              onChange={set('coordinates')}
            />
            <small>In Google Maps, right-click the restaurant and click the coordinates to copy them.</small>
          </label>
          <label className="field span-2">
            <span>Cover photo URL</span>
            <input
              required
              type="url"
              placeholder="https://…"
              value={form.coverImageUrl}
              onChange={set('coverImageUrl')}
            />
          </label>
          <label className="field span-2">
            <span>
              Description <em>optional</em>
            </span>
            <textarea rows={3} maxLength={500} value={form.description} onChange={set('description')} />
          </label>
          <label className="field span-2">
            <span>
              Owner phone <em>optional</em>
            </span>
            <input
              inputMode="tel"
              placeholder="+91 98000 00005"
              value={form.ownerPhone}
              onChange={set('ownerPhone')}
            />
            <small>The owner logs in to TreatU Partner with this number. Opening hours start at 11:00–23:00 every day; the owner can change them in the app.</small>
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? 'Adding…' : 'Add restaurant'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
