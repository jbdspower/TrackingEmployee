// Time utility functions for consistent IST display

/**
 * Format a UTC timestamp to IST display format
 * @param utcTime - UTC timestamp string
 * @returns Formatted IST time string
 */
export function formatTimeIST(utcTime: string): string {
  const date = new Date(utcTime);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Format a UTC timestamp to IST date only
 * @param utcTime - UTC timestamp string
 * @returns Formatted IST date string
 */
export function formatDateIST(utcTime: string): string {
  const date = new Date(utcTime);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format a UTC timestamp to IST time only
 * @param utcTime - UTC timestamp string
 * @returns Formatted IST time string (HH:MM:SS)
 */
export function formatTimeOnlyIST(utcTime: string): string {
  const date = new Date(utcTime);
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Check if a UTC timestamp is today in IST
 * @param utcTime - UTC timestamp string
 * @returns true if the date is today in IST
 */
export function isTodayIST(utcTime: string): boolean {
  const date = new Date(utcTime);
  const today = new Date();
  
  // Convert both to IST date strings and compare
  const dateIST = date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const todayIST = today.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return dateIST === todayIST;
}

/**
 * Get current time in IST as display string
 * @returns Current IST time string
 */
export function getCurrentTimeIST(): string {
  const now = new Date();
  return now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}