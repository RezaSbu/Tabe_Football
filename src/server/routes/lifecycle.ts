import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { requirePermission } from "../middleware/auth";
import { recordLifecycleEvent, fetchLifecycleState } from "../services/lifecycle";

// Employment/Appointment Lifecycle API (P3). The event-sourced domain:
// reasons are data-driven (GET /api/lifecycle/reasons), every mutation is
// one validated event + atomic appointment projection, corrections are
// append-only. Transfer News is untouched (separate routes/table).
export function registerLifecycleRoutes(app: Express) {
  // Data-driven vocabularies (never hardcoded in frontend).
  app.get("/api/lifecycle/reasons", (req: Request, res: Response) => {
    const db = loadDB();
    const rows = Array.isArray(db.lifecycleReasons) ? db.lifecycleReasons : [];
    const { category } = req.query as any;
    const out = category
      ? rows.filter((r: any) => String(r.category) === String(category))
      : rows;
    res.json({ success: true, reasons: out });
  });

  // Read-side: events + appointment projection (memory mirror).
  app.get("/api/lifecycle/events", requirePermission("coaches"), (req: Request, res: Response) => {
    const db = loadDB();
    const { personKind, personId } = req.query as any;
    let rows = Array.isArray(db.lifecycleEvents) ? db.lifecycleEvents : [];
    if (personKind) rows = rows.filter((e: any) => String(e.personKind) === String(personKind));
    if (personId) rows = rows.filter((e: any) => String(e.personId) === String(personId));
    rows = [...rows].sort((a: any, b: any) =>
      String(b.eventDate || "").localeCompare(String(a.eventDate || "")) ||
      (Number(b.sequence) || 0) - (Number(a.sequence) || 0)
    );
    res.json({ success: true, events: rows });
  });

  app.get("/api/lifecycle/appointments", requirePermission("coaches"), (req: Request, res: Response) => {
    const db = loadDB();
    const { coachId, teamId, active } = req.query as any;
    let rows = Array.isArray(db.coachAppointments) ? db.coachAppointments : [];
    if (coachId) rows = rows.filter((a: any) => String(a.coachId) === String(coachId));
    if (teamId) rows = rows.filter((a: any) => String(a.teamId) === String(teamId));
    if (active === "1") rows = rows.filter((a: any) => a.status === "ACTIVE" && a.endDate == null);
    res.json({ success: true, appointments: rows });
  });

  // The single write path: one validated event + atomic projection.
  app.post("/api/lifecycle/events", requirePermission("coaches"), async (req: Request, res: Response) => {
    const body = req.body || {};
    const user = (req as any).user || {};
    const result = await recordLifecycleEvent(
      {
        personKind: body.personKind,
        personId: String(body.personId || "").trim(),
        eventKind: String(body.eventKind || "").trim(),
        teamId: body.teamId != null && String(body.teamId).trim() !== "" ? String(body.teamId).trim() : null,
        seasonId: body.seasonId != null && String(body.seasonId).trim() !== "" ? String(body.seasonId).trim() : null,
        eventDate: String(body.eventDate || "").trim(),
        sequence: Number(body.sequence) || 0,
        reasonCategory: body.reasonCategory || null,
        reasonCode: body.reasonCode || null,
        correctionOf: body.correctionOf || null,
        note: body.note != null ? String(body.note) : null,
      },
      { actor: user.username || "admin", path: "/api/lifecycle/events" }
    );
    res.status(result.status).json(result.payload);
  });

  // Availability probe for the wizard: current holder + open appointments.
  app.get("/api/lifecycle/availability", requirePermission("coaches"), async (req: Request, res: Response) => {
    const db = loadDB();
    const { coachId, teamId } = req.query as any;
    const holder = teamId
      ? (db.coaches || []).find((c: any) => c.teamId != null && String(c.teamId) === String(teamId))
      : null;
    const coach = coachId
      ? (db.coaches || []).find((c: any) => String(c.id) === String(coachId))
      : null;
    const openForCoach = coachId
      ? (db.coachAppointments || []).filter(
          (a: any) => String(a.coachId) === String(coachId) && a.status === "ACTIVE" && a.endDate == null
        )
      : [];
    const state = await fetchLifecycleState().catch(() => ({ events: [], appointments: [], reasons: [] }));
    void state;
    res.json({
      success: true,
      holder: holder ? { id: holder.id, name: holder.name } : null,
      coach: coach ? { id: coach.id, name: coach.name, teamId: coach.teamId || null, isRetired: coach.isRetired === true } : null,
      openAppointments: openForCoach,
    });
  });
}
