import { useState } from 'react';
import { ApiError, removeRestaurant, type AdminRestaurant } from '../api';
import { Modal } from './Modal';

interface Props {
  restaurant: AdminRestaurant;
  onClose: () => void;
  onRemoved: (id: string) => void;
}

export function RemoveRestaurantModal({ restaurant, onClose, onRemoved }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await removeRestaurant(restaurant.id);
      onRemoved(restaurant.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <Modal title={`Remove ${restaurant.name}?`} onClose={onClose} width={460}>
      <p className="muted">
        It disappears from the TreatU app right away and its offers stop.
        {restaurant.ownerPhoneNumber && ' Its owner loses access in TreatU Partner.'} Past bookings
        stay in customers’ history.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="secondary-button" onClick={onClose}>
          Cancel
        </button>
        <button className="danger-button solid" onClick={confirm} disabled={busy}>
          {busy ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </Modal>
  );
}
