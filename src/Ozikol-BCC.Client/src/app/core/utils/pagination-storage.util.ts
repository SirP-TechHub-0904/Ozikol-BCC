/**
 * Persistence helpers for remembering user-selected table page sizes ("entries per page")
 * in browser localStorage until browser site data/cache is cleared.
 */

const STORAGE_PREFIX = 'oz_table_page_size_';

/**
 * Loads the previously saved page size for a given table key from localStorage.
 * Falls back to `defaultSize` when unset or invalid.
 *
 * @param tableKey Unique identifier for the table/screen (e.g., `'web_pages'`).
 * @param defaultSize Default entries-per-page count when no saved value exists.
 * @returns Positive numeric page size preference.
 */
export function getSavedPageSize(tableKey: string, defaultSize: number = 10): number {
  try {
    if (typeof localStorage === 'undefined') {
      return defaultSize;
    }
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`);
    if (!raw) {
      return defaultSize;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultSize;
  } catch {
    return defaultSize;
  }
}

/**
 * Normalizes and persists the user's selected page size to localStorage.
 *
 * @param tableKey Unique identifier for the table/screen.
 * @param value Selected page size value from the UI control.
 * @param fallback Fallback numeric value if `value` is invalid.
 * @returns Normalized positive numeric page size.
 */
export function savePageSizePreference(tableKey: string, value: number | string, fallback: number = 10): number {
  const numeric = Number(value);
  const resolved = Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, String(resolved));
    }
  } catch {
    // Ignore storage quota or private-browsing exceptions
  }
  return resolved;
}

