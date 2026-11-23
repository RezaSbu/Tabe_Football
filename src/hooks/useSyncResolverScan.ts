import { useCallback, useSyncExternalStore } from "react";
import {
  computeResolverFindings,
  isHealEligible,
  type ResolverFinding,
  type ResolverInput,
  type ResolverSummary,
} from "../shared/syncResolver";

export interface ResolverScanSources {
  matches: ResolverInput["matches"];
  players: ResolverInput["players"];
  standings: ResolverInput["standings"];
  teams: ResolverInput["teams"];
  currentSeasonId: ResolverInput["currentSeasonId"];
}

export interface ResolverScanResult {
  findings: ResolverFinding[];
  summary: ResolverSummary;
  scannedAt: number;
  /** The exact inputs that produced this result (reference identity). */
  sources: ResolverScanSources;
}

// Module-level store: the result must survive admin tab switches, because the
// dashboard is unmounted whenever another tab is opened.
let scanResult: ResolverScanResult | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ResolverScanResult | null {
  return scanResult;
}

/**
 * Data props are replaced by reference on every refresh, so identity is a
 * cheap and reliable staleness check — no deep compare on 1,600 players.
 */
export function isScanStale(scan: ResolverScanResult | null, input: ResolverInput): boolean {
  if (!scan) return false;
  return (
    scan.sources.matches !== input.matches ||
    scan.sources.players !== input.players ||
    scan.sources.standings !== input.standings ||
    scan.sources.teams !== input.teams ||
    scan.sources.currentSeasonId !== input.currentSeasonId
  );
}

/**
 * The database reconciliation scan is user-triggered only. It used to run on
 * every dashboard mount and on every poll refresh, freezing the panel; it is
 * now an explicit action, and the last result is reused until the data changes.
 */
export function useSyncResolverScan() {
  const scan = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const run = useCallback((input: ResolverInput): ResolverScanResult => {
    const { findings, summary } = computeResolverFindings(input);
    scanResult = {
      findings,
      summary,
      scannedAt: Date.now(),
      sources: {
        matches: input.matches,
        players: input.players,
        standings: input.standings,
        teams: input.teams,
        currentSeasonId: input.currentSeasonId,
      },
    };
    listeners.forEach((listener) => listener());
    return scanResult;
  }, []);

  /**
   * Remove findings the server just confirmed as repaired, so the matrix never
   * keeps showing rows the admin already fixed. The stale marker still flags
   * that the underlying data changed and a fresh scan is available.
   */
  const dropFindings = useCallback((predicate: (finding: ResolverFinding) => boolean) => {
    if (!scanResult) return;
    const findings = scanResult.findings.filter((finding) => !predicate(finding));
    const byReason: Record<string, number> = {};
    for (const finding of findings) byReason[finding.reason] = (byReason[finding.reason] || 0) + 1;
    scanResult = {
      ...scanResult,
      findings,
      summary: {
        ...scanResult.summary,
        total: findings.length,
        eligible: findings.filter(isHealEligible).length,
        byReason,
      },
    };
    listeners.forEach((listener) => listener());
  }, []);

  return { scan, run, dropFindings };
}
