// Shapes returned by the API (the frontend imports nothing from here - it has its own typed client).
export type ElectionStatus = "upcoming" | "active" | "ended" | "cancelled";

export function electionStatus(e: { startTime: Date; endTime: Date; cancelledEventId: string | null }, now = new Date()): ElectionStatus {
  if (e.cancelledEventId) return "cancelled";
  if (now < e.startTime) return "upcoming";
  if (now >= e.endTime) return "ended";
  return "active";
}
