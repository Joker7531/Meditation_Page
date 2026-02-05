export const BREATH_CYCLE_SEC = 19;

export type BreathPhase = "inhale" | "hold" | "exhale";

export function getBreathPhase(tInCycleSec: number): {
  phase: BreathPhase;
  label: string;
} {
  const t = ((tInCycleSec % BREATH_CYCLE_SEC) + BREATH_CYCLE_SEC) % BREATH_CYCLE_SEC;

  if (t < 4) return { phase: "inhale", label: "Breathe in" };
  if (t < 11) return { phase: "hold", label: "Hold" };
  return { phase: "exhale", label: "Breathe out" };
}

export function completedCycles(elapsedActiveSec: number): number {
  if (!Number.isFinite(elapsedActiveSec) || elapsedActiveSec <= 0) return 0;
  return Math.floor(elapsedActiveSec / BREATH_CYCLE_SEC);
}

export function formatDuration(sec: number): string {
  const total = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
