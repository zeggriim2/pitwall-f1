/** Small, dependency-free statistics toolkit. All functions are pure. */

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle] as number
  return sorted.length % 2 === 0 ? (upper + (sorted[middle - 1] as number)) / 2 : upper
}

/** Sample standard deviation (n - 1). */
export function standardDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null
  const avg = mean(values) as number
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export interface LinearFit {
  slope: number
  intercept: number
}

/** Ordinary least squares. Returns null when the fit is not meaningful. */
export function linearRegression(points: ReadonlyArray<readonly [number, number]>): LinearFit | null {
  if (points.length < 2) return null
  const n = points.length
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / n
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / n
  let covariance = 0
  let varianceX = 0
  for (const [x, y] of points) {
    covariance += (x - meanX) * (y - meanY)
    varianceX += (x - meanX) ** 2
  }
  if (varianceX === 0) return null
  const slope = covariance / varianceX
  return { slope, intercept: meanY - slope * meanX }
}

export function minBy<T>(items: readonly T[], score: (item: T) => number | null): T | null {
  let best: T | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const item of items) {
    const value = score(item)
    if (value !== null && value < bestScore) {
      best = item
      bestScore = value
    }
  }
  return best
}

export function round(value: number | null, digits = 3): number | null {
  if (value === null || !Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
