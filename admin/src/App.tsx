import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  getOverview,
  isSignedIn,
  listRestaurants,
  setSignedOutHandler,
  signOut,
  type AdminRestaurant,
  type Overview,
} from './api';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { StatCard } from './components/StatCard';
import { RestaurantsTable } from './components/RestaurantsTable';
import { AddRestaurantModal } from './components/AddRestaurantModal';
import { RemoveRestaurantModal } from './components/RemoveRestaurantModal';
import { CalendarIcon, UsersIcon } from './components/icons';

export function App() {
  const [signedIn, setSignedIn] = useState(isSignedIn);

  useEffect(() => setSignedOutHandler(() => setSignedIn(false)), []);

  return signedIn ? (
    <Dashboard />
  ) : (
    <Login onSignedIn={() => setSignedIn(true)} />
  );
}

function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [restaurants, setRestaurants] = useState<AdminRestaurant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AdminRestaurant | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [o, r] = await Promise.all([getOverview(), listRestaurants()]);
      setOverview(o);
      setRestaurants(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Header onSignOut={signOut} />
      <main className="page">
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">
          Manage your {overview?.cityName ?? '…'} launch.
        </p>

        {error && (
          <div className="banner-error">
            {error}
            <button className="link-button" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}

        <div className="stats">
          <StatCard
            icon={<UsersIcon width={52} height={52} />}
            label="Registered users"
            value={overview?.registeredUsers ?? null}
            caption="All time"
          />
          <StatCard
            icon={<CalendarIcon width={56} height={56} />}
            label="Total bookings"
            value={overview?.totalBookings ?? null}
            caption="All time"
          />
        </div>

        <RestaurantsTable
          restaurants={restaurants}
          onAdd={() => setAdding(true)}
          onRemove={setRemoving}
        />
      </main>

      {adding && (
        <AddRestaurantModal
          onClose={() => setAdding(false)}
          onAdded={(r) => {
            setAdding(false);
            setRestaurants((list) => [r, ...(list ?? [])]);
          }}
        />
      )}
      {removing && (
        <RemoveRestaurantModal
          restaurant={removing}
          onClose={() => setRemoving(null)}
          onRemoved={(id) => {
            setRemoving(null);
            setRestaurants((list) => list?.filter((r) => r.id !== id) ?? null);
          }}
        />
      )}
    </>
  );
}
