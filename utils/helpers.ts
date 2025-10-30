import { DateTime } from "luxon";
import type { ValidLookerString } from "./types";

const ZONE = "America/Phoenix";
const HOF_FIRST_RELEASE = DateTime.fromISO("2024-04-25T17:00", { zone: ZONE });
const HOF_OFFSET = 100_000;

// Utility to get difference in days between two dates
function diffDays(date1: Date, date2: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((date1.getTime() - date2.getTime()) / msPerDay);
  }
  

function hofWeekIdAt(dt: DateTime): number {
    // Before the very first release => no week yet (return 0 so callers can decide how to handle)
    if (dt < HOF_FIRST_RELEASE) return 0;
    // 1-based week number: first release window is week 1
    return Math.floor(dt.diff(HOF_FIRST_RELEASE, "weeks").weeks);
}
  


export function calculateLatestAvailableArchiveID(name: ValidLookerString): number {
  const nowPhx = DateTime.now().setZone(ZONE);
  const todaysGameID = calculateTodaysGameId(name); 

  const isHof = String(name).toLowerCase() === "leconnectionshof";

  if (isHof) {
    const releaseThisThu = nowPhx.set({ weekday: 4, hour: 17, minute: 0, second: 0, millisecond: 0 });

    // If we’re BEFORE this week’s drop, “today’s” gameId is last week’s ⇒ latest archive is todaysGameID.
    // If AFTER drop, latest archive is last week ⇒ todaysGameID - 1.
    const latestWeek = nowPhx >= releaseThisThu ? Math.max(todaysGameID - 1, 1) : Math.max(todaysGameID, 1);
    return HOF_OFFSET + latestWeek;
  }

  // Daily games (leconnections, hoopgrids): release at 5 PM PHX
  const releaseToday = nowPhx.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
  const afterRelease = nowPhx >= releaseToday;

  // After 5 PM: latest archive is yesterday
  // Before 5 PM: latest archive is two days ago
  const archiveId = afterRelease ? (todaysGameID - 1) : (todaysGameID - 2);
  return Math.max(archiveId, 1);
}


  export function calculateTodaysGameId(name: ValidLookerString): number {
    const today = new Date();
    return calculateGameId(name, today);
  }
  
  // --- calculate_game_id ---
  export function calculateGameId(name: ValidLookerString, dateToCalc: Date): number {
    // needs to be timezone aware
    // le connections is released at 5PM AZ time
    const dtPhx = DateTime.fromJSDate(dateToCalc, { zone: ZONE });

    switch (name) {
      case "leconnections": {
        const start = new Date(2024, 1, 25);
        return diffDays(dateToCalc, start);
      }
      case "hoopgrids": {
        const start = new Date(2024, 2, 11);
        return diffDays(dateToCalc, start);
      }
      case "leconnectionshof": {
        return hofWeekIdAt(dtPhx);
      }
      default:
        throw new Error(`Unknown name: ${name}`);
    }
  }
  
  export function calculateGameDate(siteName: ValidLookerString, gameId: number): Date {
    let start: Date;
  
    switch (siteName) {
      case "leconnections":
        start = new Date(2024, 1, 24); // Feb 24, 2024
        start.setDate(start.getDate() + gameId);
        return start
  
      case "hoopgrids":
        start = new Date(2024, 2, 10); // Mar 10, 2024
        start.setDate(start.getDate() + gameId);
        return start
  
      case "leconnectionshof":
        // weekly releases starting Apr 26, 2024
        start = new Date(2024, 3, 19); 
        start.setDate(start.getDate() + gameId * 7 - 700000); // adjust for game_id - 100000
        return start
  
      default:
        throw new Error(`Unknown site_name: ${siteName}`);
    }
  }
  