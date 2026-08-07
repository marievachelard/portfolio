export type DevPanelValues = {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  titleToRule1: number;
  rule1ToRule2: number;
  imageFlankGap: number;
  proseWidth: number;
  columnGap: number;
  titleTop: number;
};

export const DEFAULT_DEV_PANEL_VALUES: DevPanelValues = {
  marginTop: 80,
  marginBottom: 80,
  marginLeft: 80,
  marginRight: 80,
  titleToRule1: 12,
  rule1ToRule2: 60,
  imageFlankGap: 32,
  proseWidth: 40,
  columnGap: 40,
  titleTop: 120,
};

const STORAGE_KEY = "about-lab-dev-panel";

export function loadDevPanelValues(): DevPanelValues {
  if (typeof window === "undefined") return DEFAULT_DEV_PANEL_VALUES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DEV_PANEL_VALUES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DEV_PANEL_VALUES, ...parsed };
  } catch {
    return DEFAULT_DEV_PANEL_VALUES;
  }
}

export function saveDevPanelValues(values: DevPanelValues) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}
