/**
 * Optimistic concurrency helpers for multi-admin edits.
 *
 * Every editable entity carries an `updatedAt` timestamp. An admin's edit form
 * submits the `updatedAt` it loaded (base version). If the stored record has a
 * newer `updatedAt`, a conflict is detected and the write is rejected (409)
 * instead of silently overwriting another admin's changes.
 *
 * Callers that do NOT send `updatedAt` (e.g. live-match simulation) keep the
 * legacy last-write-wins behaviour and are never blocked.
 */

export function getUpdatedAt(entity: any): string | undefined {
  if (!entity || typeof entity !== "object") return undefined;
  return entity.updatedAt;
}

export function detectConflict(entity: any, baseVersion: string | undefined): boolean {
  if (!baseVersion) return false;
  const current = getUpdatedAt(entity);
  if (!current) return false;
  return current !== baseVersion;
}

export function touch(entity: any): void {
  if (entity && typeof entity === "object") {
    entity.updatedAt = new Date().toISOString();
  }
}
