import { useEffect, useState } from "react";

const STORAGE_KEY = "fir-saathi-officer-dark-workspace";

export function useOfficerWorkspaceTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem(STORAGE_KEY) === "dark");
  useEffect(() => { localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light"); }, [dark]);
  return { dark, toggle: () => setDark((value) => !value) };
}
