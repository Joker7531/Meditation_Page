import { render, screen } from "@testing-library/react";
import MeditationClient from "../app/meditation/MeditationClient";

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams("durationMin=10&__testDurationSec=60&__testSeed=1"),
  };
});

describe("Meditation particles", () => {
  it("renders 230 particles", () => {
    render(<MeditationClient />);

    const particles = screen.getAllByTestId("breathing-particle");
    expect(particles.length).toBe(230);
  });
});
