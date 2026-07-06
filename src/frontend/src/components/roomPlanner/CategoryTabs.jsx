import { THEME, ON_PRIMARY } from "./theme";

/* ─────────────────── CATEGORY TABS ───────────────────
 *
 *  Horizontal, scrollable pill buttons. The active category is filled with the
 *  primary/orange colour. Pure presentational — parent owns the selection.
 */
export default function CategoryTabs({ categories, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <div
        className="flex items-center gap-2 px-1 text-sm whitespace-nowrap"
        style={{ color: THEME.secondary }}
      >
        <span className="animate-spin" style={{ color: THEME.primary }}>
          ⌛
        </span>{" "}
        Đang tải danh mục...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto r3d-scroll py-1">
      {categories.map((cat) => {
        const active = selectedId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 border transition-all duration-200 hover:brightness-110"
            style={
              active
                ? { background: THEME.primary, color: ON_PRIMARY, borderColor: THEME.primary }
                : { background: THEME.card, color: THEME.secondary, borderColor: THEME.border }
            }
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
