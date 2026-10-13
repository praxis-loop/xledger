// Report buckets are calendar days/months in the user's zone (the client sends its zone with the query).
// Read the calendar date straight from the string: `new Date('2026-05-03T00:00:00Z')` lands on May 2
// in any zone west of UTC, which put amounts in the wrong day or month bucket.
export function localDateFromBucket(bucketStart: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(bucketStart)
  if (!match) return new Date(bucketStart)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}
