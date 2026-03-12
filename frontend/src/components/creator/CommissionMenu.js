'use client';

import { CommissionStatusBadge } from './CommissionStatusBadge';

// Displays the creator's commission price list, turnaround time, and terms
export function CommissionMenu({ info, status }) {
  if (!info?.menu?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Commissions</h2>
        <CommissionStatusBadge status={status} />
      </div>

      {/* Price list */}
      <div className="border rounded-lg divide-y">
        {info.menu.map((item, i) => (
          <div key={i} className="flex justify-between p-4">
            <div>
              <p className="font-medium">{item.name}</p>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
            <p className="font-semibold text-primary whitespace-nowrap">{item.price}</p>
          </div>
        ))}
      </div>

      {/* Turnaround and contact info */}
      <div className="text-sm text-muted-foreground space-y-1">
        {info.turnaround && <p>Turnaround: {info.turnaround}</p>}
        {info.contactMethod && <p>Contact: {info.contactMethod}</p>}
      </div>

      {/* Collapsible terms */}
      {info.terms && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">View Terms</summary>
          <p className="mt-2 p-3 bg-muted rounded">{info.terms}</p>
        </details>
      )}
    </div>
  );
}
