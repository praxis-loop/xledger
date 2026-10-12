// Mirrors the OpenAPI Account.type enum. Legacy rows can still carry other values; render those as "other".
export const ACCOUNT_TYPES = ['debit', 'credit', 'cash', 'ewallet'] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]

export function isKnownAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value)
}

export function getAccountTypeLabelKey(value: string) {
  return isKnownAccountType(value) ? `accountTypes.${value}` : 'accountTypes.other'
}
