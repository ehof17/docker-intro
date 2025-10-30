#!/usr/bin/env ts-node

import StorageService from "./services/storage";
import type { ValidLookerString } from "./utils/types";
import  {calculateLatestAvailableArchiveID } from "./utils/helpers";

export async function getMissingConnectionIDs(
  siteName: ValidLookerString,
  opts?: { startId?: number; endId?: number }
): Promise<number[]> {
  const storage = new StorageService();

  const existingIdsRaw = await storage.getAllGameIdsBySite(siteName); 

  const existingIds = new Set(
    existingIdsRaw
      .map((x: any) => (typeof x === "number" ? x : parseInt(String(x), 10)))
      .filter(Number.isFinite)
  );

  // idk if this matters
  // i dont think we can get todays game from the gameId
  // the final game cam only be grabbed if it is passed  5pm AZ time at runtime.
  // That would be todays ID -1.
  // otherwise, the final game available would be todays ID - 2
  const latest = await Promise.resolve(calculateLatestAvailableArchiveID(siteName)); 


  const startId = opts?.startId ?? 0;
  const endId = opts?.endId ?? latest;

  if (!Number.isFinite(startId) || !Number.isFinite(endId) || endId < startId) {
    return [];
  }

  let missing: number[] = [];
  for (let id = startId; id <= endId; id++) {
    if (!existingIds.has(id)) missing.push(id);
  }

  // remove 204
  if (siteName === "hoopgrids") {
    missing = missing.filter(id => id !== 204);
  }
  else if (siteName === "leconnectionshof"){
    missing = missing.filter(id=> id !== 100075)
    missing = missing.filter(id=> id !== 100076)
  }

  return missing;
}

async function main() {
    const siteName = process.argv[2];
    const start = parseInt(process.argv[3] ?? "0", 10);
    const end = parseInt(process.argv[4] ?? "NaN", 10);
  
    const ids = await getMissingConnectionIDs(siteName as any, {
      startId: Number.isFinite(start) ? start : undefined,
      endId: Number.isFinite(end) ? end : undefined,
    });
  
    console.log(JSON.stringify(ids));
  }
  
  if (require.main === module) {
    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  }