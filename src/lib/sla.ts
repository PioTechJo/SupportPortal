/**
 * A ticket is overdue starting the day AFTER its SLA due date: on the due
 * date itself it is still on time, even if the due time has already passed.
 * Compared by calendar day in the viewer's local time.
 */
export function isPastSlaDueDay(dueDate: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return false;
  const endOfDueDay = new Date(due);
  endOfDueDay.setHours(23, 59, 59, 999);
  return now.getTime() > endOfDueDay.getTime();
}
