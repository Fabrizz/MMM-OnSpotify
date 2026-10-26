const DAY = 24 * 60 * 60 * 1000

export const daysUntil = (time: number) => Math.ceil((time - Date.now()) / DAY)

export const formatDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}
