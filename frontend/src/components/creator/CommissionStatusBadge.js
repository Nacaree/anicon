'use client';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-green-500' },
  waitlist: { label: 'Waitlist', color: 'bg-yellow-500' },
  closed: { label: 'Closed', color: 'bg-red-500' },
};

// Shows whether the creator is accepting commissions (green/yellow/red dot + label)
export function CommissionStatusBadge({ status }) {
  if (!status) return null;

  const { label, color } = STATUS_CONFIG[status] || STATUS_CONFIG.closed;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs text-white ${color}`}>
      <span className="w-1.5 h-1.5 bg-white rounded-full" />
      {label}
    </span>
  );
}
