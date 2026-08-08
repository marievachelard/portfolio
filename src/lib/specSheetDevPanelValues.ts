export type DevPanelValues = {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  titleToRule1: number;
  rule1ToRule2: number;
  imageFlankGap: number;
  columnGap: number;
  titleTop: number;
};

// The dev panel these were once tuned through is gone; this is just the values
// it settled on, kept as the fixed layout the About spec sheet renders with.
export const DEFAULT_DEV_PANEL_VALUES: DevPanelValues = {
  marginTop: 80,
  marginBottom: 80,
  marginLeft: 80,
  marginRight: 80,
  titleToRule1: 12,
  rule1ToRule2: 60,
  imageFlankGap: 32,
  columnGap: 40,
  titleTop: 120,
};
