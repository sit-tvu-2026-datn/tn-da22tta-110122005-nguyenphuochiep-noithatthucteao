import { THEME } from "./theme";

/* ─────────────────── SEARCH BAR ───────────────────
 *
 *  Controlled text input used to filter the visible products by name.
 *  Shows a clear (✕) button once there's a query.
 */
export default function SearchBar({ value, onChange, placeholder = "Tìm sản phẩm..." }) {
  return (
    <div className="relative w-full">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
        style={{ color: THEME.secondary }}
      >
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 rounded-lg text-sm outline-none border transition-colors focus:border-[#F5A623]"
        style={{ background: THEME.card, borderColor: THEME.border, color: THEME.text }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Xoá tìm kiếm"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-xs hover:brightness-125"
          style={{ color: THEME.secondary }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
