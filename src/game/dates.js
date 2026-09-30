// Date helpers.
//
// The whole app stores dates as plain 'YYYY-MM-DD' strings ("days"), never as
// Date objects. That avoids time-zone surprises: a deadline of 2026-11-30 is
// the same day whatever time it is.

// Turn a Date object (or a longer date string) into a 'YYYY-MM-DD' day.
export function toDay(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  return match ? match[1] : null;
}

// Today's date on this computer.
export function todayDay() {
  return toDay(new Date());
}

// Number of days since 1 Jan 1970 - only used to subtract two days.
function dayNumber(day) {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// Whole days from `a` to `b`. Positive when b is later than a.
export function dayDiff(a, b) {
  return dayNumber(b) - dayNumber(a);
}

// The day `n` days after `day` (n can be negative).
export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// The Monday of the week that `day` falls in.
export function weekStart(day) {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-11-30' -> '30 Nov 2026'
export function formatDay(day) {
  if (!day) return '';
  const [y, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
