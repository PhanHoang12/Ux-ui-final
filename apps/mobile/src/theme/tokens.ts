// Figma: 386:7184; shared GreenSteps / Button and Auth Field.
export const color = {
  primary: "#147CC1",
  primaryPressed: "#10669F",
  bg: "#F4FBFF",
  text: "#164561",
  muted: "#456476",
  line: "#D2E7F4",
  soft: "#E8F4FC",
  white: "#FFFFFF",
  disabled: "#E8EEF2",
  disabledText: "#566B79",
  placeholder: "#667F8F",
  danger: "#B3261E",
  dangerBg: "#FFF0EE",
  success: "#25664D",
  successBg: "#E4F2ED",
} as const;
export const font = {
  regular: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  semi: "Montserrat_600SemiBold",
  bold: "Montserrat_700Bold",
} as const;
export const typography = {
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 23 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: font.semi, fontSize: 13, lineHeight: 20 },
  button: { fontFamily: font.semi, fontSize: 15, lineHeight: 22 },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 32 },
  display: { fontFamily: font.bold, fontSize: 29, lineHeight: 41 },
} as const;
export const radius = {
  check: 7,
  input: 16,
  button: 18,
  card: 24,
  hero: 28,
} as const;
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  page: 24,
  section: 32,
} as const;
export const size = { touch: 44, control: 56, contentMax: 480 } as const;
