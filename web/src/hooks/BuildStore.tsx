import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { decodeBuild, encodeBuild } from "../engine/buildCodec";
import { gameData } from "../engine/data";
import type { Build } from "../engine/types";
import { readStored, writeStored } from "./storage";

const KEY = "isaac-toys:build:v1";

interface BuildStore {
  build: Build;
  setBuild: (next: Build) => void;
}

const Context = createContext<BuildStore | null>(null);

/** The build survives moving between pages and a reload; the builder page also mirrors it in the address bar. */
export function BuildProvider({ children }: { children: ReactNode }) {
  const [build, setState] = useState<Build>(() =>
    // Stored as the same query string the address bar uses, so it gets the same validation.
    decodeBuild(new URLSearchParams(readStored<string>(KEY, "")), gameData),
  );
  const setBuild = useCallback((next: Build) => {
    setState(next);
    writeStored(KEY, encodeBuild(next));
  }, []);
  const value = useMemo(() => ({ build, setBuild }), [build, setBuild]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBuildStore(): BuildStore {
  const store = useContext(Context);
  if (!store) throw new Error("useBuildStore needs a BuildProvider above it");
  return store;
}
