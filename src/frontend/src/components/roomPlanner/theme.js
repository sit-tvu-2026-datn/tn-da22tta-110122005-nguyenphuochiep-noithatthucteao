/* ─────────────────── ROOM PLANNER · DARK THEME PALETTE ───────────────────
 *
 *  Single source of truth for the Room Planner UI colours so every extracted
 *  component (ProductCard / CategoryTabs / SearchBar) and the collapsible
 *  panels stay perfectly in sync.
 */
export const THEME = {
  bg: "#111111",        // App background
  panel: "#1B1B1B",     // Sidebar / bottom-bar surface
  card: "#1E1E1E",      // Product card / input surface
  border: "#2B2B2B",    // Hairline borders
  primary: "#F5A623",   // Accent (orange)
  text: "#FFFFFF",      // Primary text
  secondary: "#A0A0A0", // Muted text
};

// Ink used on top of the primary/orange fills so labels stay readable.
export const ON_PRIMARY = "#111111";
