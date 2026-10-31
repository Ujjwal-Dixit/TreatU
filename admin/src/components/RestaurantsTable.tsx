import type { AdminRestaurant } from '../api';
import { PlusIcon, TrashIcon } from './icons';

interface Props {
  restaurants: AdminRestaurant[] | null;
  onAdd: () => void;
  onRemove: (restaurant: AdminRestaurant) => void;
}

export function RestaurantsTable({ restaurants, onAdd, onRemove }: Props) {
  return (
    <section className="card restaurants">
      <div className="restaurants-head">
        <h2>Restaurants</h2>
        <button className="primary-button" onClick={onAdd}>
          <PlusIcon width={22} height={22} />
          Add restaurant
        </button>
      </div>

      <div className="table">
        <div className="table-row table-header">
          <span>Restaurant</span>
          <span className="col-area">Area</span>
          <span className="col-action">Action</span>
        </div>
        {restaurants === null ? (
          <p className="table-empty">Loading…</p>
        ) : restaurants.length === 0 ? (
          <p className="table-empty">No restaurants yet. Add your first one.</p>
        ) : (
          restaurants.map((r) => (
            <div className="table-row" key={r.id}>
              <span className="col-name">
                {r.name}
                <span className="col-area-inline">{r.area}</span>
              </span>
              <span className="col-area">{r.area}</span>
              <span className="col-action">
                <button className="danger-button" onClick={() => onRemove(r)}>
                  <TrashIcon width={18} height={18} />
                  Remove
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
