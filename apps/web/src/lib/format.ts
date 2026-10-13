/** 92.456 → "1:32.456" */
export function lapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds - minutes * 60
  const secs = rest.toFixed(3).padStart(6, '0')
  return minutes > 0 ? `${minutes}:${secs}` : rest.toFixed(3)
}

/** 0.1234 → "+0.123" */
export function delta(seconds: number | null | undefined, digits = 3): string {
  if (seconds === null || seconds === undefined) return '—'
  const sign = seconds > 0 ? '+' : seconds < 0 ? '−' : '±'
  return `${sign}${Math.abs(seconds).toFixed(digits)}`
}

export function seconds(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(digits)} s`
}

export function raceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function signed(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value > 0 ? `+${value}` : `${value}`
}

/** Country code → flag emoji when it is an ISO-3166 alpha-2 code; F1 uses alpha-3, so we map the common ones. */
const ALPHA3: Record<string, string> = {
  BRN: 'BH',
  KSA: 'SA',
  AUS: 'AU',
  JPN: 'JP',
  CHN: 'CN',
  USA: 'US',
  ITA: 'IT',
  MON: 'MC',
  CAN: 'CA',
  ESP: 'ES',
  AUT: 'AT',
  GBR: 'GB',
  HUN: 'HU',
  BEL: 'BE',
  NED: 'NL',
  AZE: 'AZ',
  SGP: 'SG',
  MEX: 'MX',
  BRA: 'BR',
  QAT: 'QA',
  UAE: 'AE',
  FRA: 'FR',
  GER: 'DE',
  POR: 'PT',
  RUS: 'RU',
  TUR: 'TR',
  VIE: 'VN',
}

export function flag(countryCode: string): string {
  const alpha2 = ALPHA3[countryCode] ?? (countryCode.length === 2 ? countryCode : null)
  if (!alpha2) return '🏁'
  return String.fromCodePoint(...[...alpha2.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}
