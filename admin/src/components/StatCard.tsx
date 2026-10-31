import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | null;
  caption: string;
}

export function StatCard({ icon, label, value, caption }: StatCardProps) {
  return (
    <section className="card stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">
          {value === null ? <span className="skeleton" /> : value.toLocaleString('en-IN')}
        </p>
        <p className="stat-caption">{caption}</p>
      </div>
    </section>
  );
}
