import { describe, expect, it } from "vitest";
import {
  BREATH_CYCLE_SEC,
  completedCycles,
  formatDuration,
  getBreathPhase,
} from "../lib/breathing";

describe("breathing domain", () => {
  it("has a 19s cycle", () => {
    expect(BREATH_CYCLE_SEC).toBe(19);
  });

  it("maps phases at boundaries", () => {
    expect(getBreathPhase(0).phase).toBe("inhale");
    expect(getBreathPhase(3.99).phase).toBe("inhale");

    expect(getBreathPhase(4).phase).toBe("hold");
    expect(getBreathPhase(10.99).phase).toBe("hold");

    expect(getBreathPhase(11).phase).toBe("exhale");
    expect(getBreathPhase(18.99).phase).toBe("exhale");
  });

  it("wraps phase time into cycle", () => {
    expect(getBreathPhase(19).phase).toBe(getBreathPhase(0).phase);
    expect(getBreathPhase(20).phase).toBe(getBreathPhase(1).phase);
  });

  it("computes completed cycles", () => {
    expect(completedCycles(0)).toBe(0);
    expect(completedCycles(18.99)).toBe(0);
    expect(completedCycles(19)).toBe(1);
    expect(completedCycles(38)).toBe(2);
  });

  it("formats duration consistently", () => {
    expect(formatDuration(0)).toBe("0m 00s");
    expect(formatDuration(1)).toBe("0m 01s");
    expect(formatDuration(61)).toBe("1m 01s");
    expect(formatDuration(600)).toBe("10m 00s");
  });
});
