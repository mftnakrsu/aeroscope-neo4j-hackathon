// Static catalogue of the four fictional UAV platforms used across AeroScope.
// Keep this in sync with the corpus seed entities (aura/schema + data/corpus).
// Every platform code/name shown in the UI must resolve to one of these four.

export type Platform = {
  /** Short 4-letter code used as a compact badge in cards/tables. */
  code: string;
  /** Human-facing platform name as stored in the graph (:Platform.name). */
  name: string;
  /** One-line mission role for quick orientation in tooltips/legends. */
  role: string;
};

export const PLATFORMS: Platform[] = [
  { code: "STR7", name: "Stratos-7", role: "HALE ISR" },
  { code: "ALX2", name: "AeroLynx-X2", role: "MALE Strike" },
  { code: "SKT1", name: "Skyrunner-T1", role: "Tactical ISR" },
  { code: "NBC3", name: "Nimbus-C3", role: "Cargo / Resupply" },
];

/** Lookup a platform by its canonical name (e.g. "Stratos-7"). */
export function platformByName(name: string): Platform | undefined {
  return PLATFORMS.find((p) => p.name === name);
}

/** Lookup a platform by its short code (e.g. "STR7"). */
export function platformByCode(code: string): Platform | undefined {
  return PLATFORMS.find((p) => p.code === code);
}
