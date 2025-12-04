export interface TimezoneOption {
  value: string;
  label: string;
}

// Common timezones mapping
export const TIMEZONES: TimezoneOption[] = [
  { value: 'default', label: 'default' },
  { value: '-12:00', label: 'GMT-12:00' },
  { value: '-11:00', label: 'GMT-11:00' },
  { value: '-10:00', label: 'GMT-10:00 (HST)' },
  { value: '-09:30', label: 'GMT-09:30 (MHT)' },
  { value: '-09:00', label: 'GMT-09:00 (AKST)' },
  { value: '-08:00', label: 'GMT-08:00 (PST)' },
  { value: '-07:00', label: 'GMT-07:00 (MST)' },
  { value: '-06:00', label: 'GMT-06:00 (CST)' },
  { value: '-05:00', label: 'GMT-05:00 (EST)' },
  { value: '-04:30', label: 'GMT-04:30 (VET)' },
  { value: '-04:00', label: 'GMT-04:00 (AST)' },
  { value: '-03:30', label: 'GMT-03:30 (NST)' },
  { value: '-03:00', label: 'GMT-03:00 (BRT)' },
  { value: '-02:00', label: 'GMT-02:00 (FNT)' },
  { value: '-01:00', label: 'GMT-01:00 (AZOT)' },
  { value: '+00:00', label: 'GMT+00:00 (UTC)' },
  { value: '+01:00', label: 'GMT+01:00 (CET)' },
  { value: '+02:00', label: 'GMT+02:00 (EET)' },
  { value: '+03:00', label: 'GMT+03:00 (MSK)' },
  { value: '+03:30', label: 'GMT+03:30 (IRST)' },
  { value: '+04:00', label: 'GMT+04:00 (GST)' },
  { value: '+04:30', label: 'GMT+04:30 (AFT)' },
  { value: '+05:00', label: 'GMT+05:00 (PKT)' },
  { value: '+05:30', label: 'GMT+05:30 (IST)' },
  { value: '+05:45', label: 'GMT+05:45 (NPT)' },
  { value: '+06:00', label: 'GMT+06:00 (BST)' },
  { value: '+06:30', label: 'GMT+06:30 (MMT)' },
  { value: '+07:00', label: 'GMT+07:00 (ICT)' },
  { value: '+07:30', label: 'GMT+07:30 (CST)' },
  { value: '+08:00', label: 'GMT+08:00 (CST/SGT)' },
  { value: '+08:30', label: 'GMT+08:30 (KST)' },
  { value: '+08:45', label: 'GMT+08:45 (ACWST)' },
  { value: '+09:00', label: 'GMT+09:00 (JST/KST)' },
  { value: '+09:30', label: 'GMT+09:30 (ACST)' },
  { value: '+10:00', label: 'GMT+10:00 (AEST)' },
  { value: '+10:30', label: 'GMT+10:30 (ACDT)' },
  { value: '+11:00', label: 'GMT+11:00 (AEDT)' },
  { value: '+11:30', label: 'GMT+11:30 (NFT)' },
  { value: '+12:00', label: 'GMT+12:00 (NZST)' },
  { value: '+12:45', label: 'GMT+12:45 (CHAST)' },
  { value: '+13:00', label: 'GMT+13:00 (TOT)' },
  { value: '+13:45', label: 'GMT+13:45 (CHADT)' },
  { value: '+14:00', label: 'GMT+14:00 (LINT)' },
];

/**
 * Get timezone label by value
 */
export function getTimezoneLabel(value: string): string {
  const tz = TIMEZONES.find(t => t.value === value);
  return tz ? tz.label : value;
}

/**
 * Get timezone name (abbreviation) from label
 * e.g., "GMT+08:00 (CST/SGT)" -> "CST/SGT"
 */
export function getTimezoneName(value: string): string {
  const label = getTimezoneLabel(value);
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}
