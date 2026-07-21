import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formats an ISO timestamp as a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm")
// in the browser's local timezone — the inverse of `new Date(value)`, which the browser
// also interprets as local time, so display and submit stay symmetric.
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
