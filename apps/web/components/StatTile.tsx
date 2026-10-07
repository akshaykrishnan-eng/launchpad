import type { ReactNode } from "react";

type StatTileProps = {
  label: string;
  value: ReactNode;
  unit?: string;
};

/** A single bordered stat tile -- credit balances, interview score
 * grids. Previously the same border/radius/padding was hand-rolled
 * inline in both places. */
export function StatTile({ label, value, unit }: StatTileProps) {
  return (
    <div role="listitem" className="stat-tile">
      <p className="stat-tile-label">{label}</p>
      <p className="stat-tile-value">
        {value}
        {unit && <span className="stat-tile-value-unit"> {unit}</span>}
      </p>
    </div>
  );
}
