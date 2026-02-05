import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../app/page";
import CompletionPage from "../app/completion/page";

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(""),
  };
});

describe("Route pages", () => {
  it("renders Landing page controls", async () => {
    const user = userEvent.setup();
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Landing" })).toBeInTheDocument();

    const start = screen.getByRole("button", { name: "Start" });
    const input = screen.getByLabelText("Custom (1–60 minutes)");

    expect(start).toBeEnabled();

    await user.clear(input);
    await user.type(input, "0");
    await user.tab();

    expect(screen.getByText("请输入 1-60 之间的整数")).toBeInTheDocument();
    expect(start).toBeDisabled();
  });

  it("shows early completion dual info", () => {
    window.sessionStorage.setItem(
      "breathing:lastSummary",
      JSON.stringify({
        elapsedActiveSec: 5,
        targetDurationSec: 10,
        endReason: "early",
        completedCycles: 0,
        durationMin: 10,
      })
    );

    render(<CompletionPage />);

    expect(screen.getByRole("heading", { name: "Ended early" })).toBeInTheDocument();
    expect(screen.getByText("提前结束")).toBeInTheDocument();
    expect(screen.getByLabelText("completed-cycles")).toBeInTheDocument();
  });
});
