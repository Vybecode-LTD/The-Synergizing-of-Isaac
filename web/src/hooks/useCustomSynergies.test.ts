import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
