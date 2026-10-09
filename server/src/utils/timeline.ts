export function utcTimelineWindow(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end.getTime() - 30 * 86400000);
  const days = Array.from({ length: 30 }, (_, index) => ({ date: new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10), created: 0, completed: 0 }));
  return { start, end, days };
}
