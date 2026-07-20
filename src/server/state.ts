import path from "path";
import { INITIAL_DATABASE } from "./config";
import { logMessage } from "./utils/logger";

export let db: any = getInitialDatabase();

export function getInitialDatabase() {
  return JSON.parse(JSON.stringify(INITIAL_DATABASE));
}

export function loadDB() {
  return db;
}

export function setDb(newDb: any) {
  db = newDb;
}

export function snapshotDB(): any {
  return JSON.parse(JSON.stringify(db));
}

export function restoreDB(snapshot: any) {
  db = snapshot;
  logMessage("warn", "general", "وضعیت دیتابیس به حالت قبل بازگردانده شد.");
}
