import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clampNumber(
  value: number,
  lower: number,
  upper: number
): number {
  return Math.max(lower, Math.min(value, upper));
}
