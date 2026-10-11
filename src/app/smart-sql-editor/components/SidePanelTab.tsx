'use client';

import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * The rail element the launchers are packed into, or `null` before it mounts / when no
 * {@link SidePanelRail} is mounted above.
 */
const RailContext = createContext<HTMLElement | null>(null);

/**
 * The right-edge rail that collapsed panels stack into.
 *
 * Mount this once around the panels (it renders no visible chrome of its own). Launchers portal
 * into it, so the rail is a real flex column: tabs sit shoulder-to-shoulder with a fixed gap and
 * the whole group is centred on the viewport. Nothing is reserved for a tab that isn't rendered,
 * so a two-panel page has no hole where the third one would have been.
 */
export const SidePanelRail: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [rail, setRail] = useState<HTMLDivElement | null>(null);

  return (
    <RailContext.Provider value={rail}>
      {children}
      <div
        ref={setRail}
        data-side-panel-rail=""
        className="pointer-events-none fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-end gap-1.5"
      />
    </RailContext.Provider>
  );
};

/**
 * Order of a launcher within the rail. Purely visual, and independent of DOM/portal mount order, so
 * the rail always reads the same way no matter which panels happen to be open.
 */
export type SidePanelTabRank = 0 | 1 | 2 | 3;

/** Visual weight of a launcher. `primary` marks the main action; the rest are quiet neutrals. */
export type SidePanelTabTone = 'primary' | 'neutral' | 'danger';

const TONE_STYLES: Record<SidePanelTabTone, string> = {
  primary: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
  neutral: 'border-border bg-card text-foreground hover:bg-muted',
  danger: 'border-danger/40 bg-card text-danger hover:bg-muted hover:text-danger/80',
};

export interface SidePanelTabProps {
  /** Position in the rail, independent of which other launchers are present. */
  rank: SidePanelTabRank;
  tone?: SidePanelTabTone;
  /** Leading icon; always visible so the tab is identifiable at a glance. */
  icon: React.ReactNode;
  /** Text revealed on hover (and used as the tooltip + accessible name). */
  label: string;
  onClick: () => void;
  /** Optional tooltip; defaults to `label`. */
  title?: string;
  /** Accessible name. Defaults to `label`. */
  ariaLabel?: string;
  /** Set when the tab owns a collapsible region, so AT can report its state. */
  ariaExpanded?: boolean;
}
/**
 * A collapsed right-edge panel launcher.
 *
 * Every panel that can be collapsed used to position its own `fixed right-0` button with an
 * ad-hoc `top-[calc(50%_±_…)]` value. Three such tabs centred on the same spot sat only 1.5rem
 * apart while each was ~2.25rem tall, so they physically overlapped and covered each other's
 * click targets. Sharing this component fixes the overlap.
 *
 * The launcher portals into the nearest {@link SidePanelRail} so the tabs pack into one flex
 * column. Handing out fixed slot positions instead would have reintroduced a subtler bug: the
 * Format-error tab only exists once a format error has occurred, so a reserved slot leaves a
 * visible hole in the rail on every healthy page. Packing by flow reserves space only for tabs
 * that are actually on screen.
 */
export const SidePanelTab: React.FC<SidePanelTabProps> = ({
  rank,
  tone = 'neutral',
  icon,
  label,
  onClick,
  title,
  ariaLabel,
  ariaExpanded,
}) => {
  const rail = useContext(RailContext);

  const tab = (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={ariaLabel ?? label}
      aria-expanded={ariaExpanded}
      data-panel-tab-rank={rank}
      style={{ order: rank }}
      className={`pointer-events-auto group flex items-center gap-0 rounded-l-lg border border-r-0 px-2.5 py-2 shadow-lg transition-all duration-200 hover:gap-2 hover:pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${TONE_STYLES[tone]}`}
    >
      {icon}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold tracking-wide opacity-0 transition-all duration-200 group-hover:max-w-[12rem] group-hover:opacity-100">
        {label}
      </span>
    </button>
  );

  // Without a rail (a panel rendered standalone, e.g. in a test) the tab still has to work; it
  // just centres on its own instead of stacking. Pages mount a SidePanelRail around their panels.
  if (!rail) {
    return <div className="fixed right-0 top-1/2 z-40 -translate-y-1/2">{tab}</div>;
  }

  return createPortal(tab, rail);
};

export default SidePanelTab;
