import { act, render, renderHook } from "@testing-library/react";
import { Component, StrictMode, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useCustomSynergies, type NewSynergy } from "./useCustomSynergies";

const entry = (description: string): NewSynergy => ({
  itemIds: [118, 38],
  trinketIds: [],
  character: null,
  rating: "A",
  description,
});

describe("useCustomSynergies", () => {
  it("applies a late change to the latest list, not the one it started from", () => {
    // CodeRabbit, PR #12: a send's completion captured the list of its render and restored it, bringing back
    // a synergy deleted meanwhile or losing one added meanwhile.
    const { result } = renderHook(() => useCustomSynergies());
    act(() => result.current.add(entry("A")));
    act(() => result.current.add(entry("B")));
    const [a, b] = result.current.mine;
    const markLater = result.current.markSubmitted; // captured before the next changes, as an await does
    const addLater = result.current.add;
    act(() => result.current.remove(b!.id));
    act(() => addLater(entry("C")));
    act(() => markLater(a!.id));

    expect(result.current.mine.map((s) => [s.description, Boolean(s.submitted)])).toEqual([
      ["A", true],
      ["C", false],
    ]);
    const saved = JSON.parse(localStorage.getItem("isaac-toys:my-synergies:v1")!);
    expect(saved.map((s: { description: string }) => s.description)).toEqual(["A", "C"]);
  });
});

describe("useCustomSynergies, saving", () => {
  it("writes to storage after the change is committed, never from inside a state update", () => {
    // CodeRabbit, PR #12 (follow-up): updaters must be pure; React may run one for a render it then drops.
    // Strict Mode runs every updater twice to show it up: storage must be written once per change.
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useCustomSynergies(), { wrapper: StrictMode });
    expect(setItem).not.toHaveBeenCalled(); // nothing written just for opening the page
    act(() => result.current.add(entry("A")));
    expect(setItem).toHaveBeenCalledTimes(1);
    act(() => result.current.markSubmitted(result.current.mine[0]!.id));
    expect(setItem).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem("isaac-toys:my-synergies:v1")!)[0].submitted).toBe(true);
    setItem.mockRestore();
  });
});

/** Shows nothing once a child throws: the render that threw is dropped, never committed. */
class DropOnError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

describe("useCustomSynergies, a render React drops", () => {
  it("leaves storage as it was when the render holding a change is never committed", () => {
    // CodeRabbit, PR #12 (follow-up): with the write inside the state updater, a render React abandoned
    // still wrote its list. Here the render that would show the new list throws, the boundary drops it,
    // and nothing may reach storage.
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let add: ((entry: NewSynergy) => void) | undefined;
    function Owner() {
      const hook = useCustomSynergies();
      add = hook.add;
      if (hook.mine.length > 0) throw new Error("this render is dropped");
      return null;
    }
    render(
      <DropOnError>
        <Owner />
      </DropOnError>,
    );
    act(() => add?.(entry("never committed")));
    expect(localStorage.getItem("isaac-toys:my-synergies:v1")).toBeNull();
    errors.mockRestore();
  });
});
