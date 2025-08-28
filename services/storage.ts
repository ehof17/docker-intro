// stores the json into the neon tables
import { db } from "../db/drizzle";
import { players, connections, connectiontoplayer } from "../db/schema"
import { eq, inArray, sql, and,notInArray } from "drizzle-orm";

import { dbConnection, solutionResult } from '../utils/types';
export default class StorageService{

    async getPlayerIDs(conn:solutionResult){
        const players = await Promise.all(
            conn.players.map(name => this.getOrInsertPlayerByName(name))
        );
        
        return players.map(p => p.playerid);
    }
    // Inserts a new connection name, or retrieves the existing one returning id
    async getOrInsertDbConnection(connName:string){
        const normalized = connName.trim().toLowerCase();
        const existing = await db
        .select()
        .from(connections)
        .where(eq(sql`lower(${connections.description})`, normalized));

        if (existing.length > 1) {
            throw new Error(`Multiple connections found with description "${connName}"`);
        }

        if (existing.length === 1) {
            return existing[0].connectionid;
        }

        // Not found -> insert new
        const inserted = await db
            .insert(connections)
            .values({ description: connName })
            .returning({ id: connections.connectionid });

        return inserted[0].id;
    }
    async ConnectConnections(playerids: number[], connectionId:number){
        // need to check if connection already exists
        const existingConnections = await db
        .select()
        .from(connectiontoplayer)
        .where(and(
            eq(connectiontoplayer.connectionid, connectionId),
            inArray(connectiontoplayer.playerid, playerids)
        ));
        const existingPlayerIds = existingConnections.map(c => c.playerid);
        const newPlayerIds = playerids.filter(id => !existingPlayerIds.includes(id));
        
        await Promise.all(
            newPlayerIds.map(id => this.insertConnectionToPlayer(id, connectionId))
        );

    }
    async insertConnectionToPlayer(playerID:number, connectionId:number){
        await db.insert(connectiontoplayer).values({
            playerid: playerID,
            connectionid: connectionId, 
          });
    }
    // db set up first and last name
    splitName(name: string): { first: string; last: string } {
        const parts = name.trim().split(" ");
        if (parts.length < 2) {
          throw new Error(`Invalid name "${name}", expected at least first and last.`);
        }
        return { first: parts[0], last: parts.slice(1).join(" ") };
      }

    async getOrInsertPlayerByName(name:string){
        // 3 options
        // player not in yet -> throw exception
        // todo: resolve this
        // will need to add them to a temp table or something
        // because we don't have birthdate or other info

        // player in -> return player

        // multiple players with name -> throw exception
        const { first, last } = this.splitName(name);

        const result = await db
        .select()
        .from(players)
        .where(and(eq(players.firstname, first), eq(players.lastname, last)));
    
        if (result.length === 0) {
            throw new Error(`Player "${first} ${last}" not found`);
        }
        
        if (result.length > 1) {
            throw new Error(`Multiple players found with name "${first} ${last}"`);
        }
        
        return result[0];

    }

    //todo: handle errors better
    // set up possible player and possible connections that will need to be resolved manually
    // for now just throw exceptions
    // 
    // could also include feature where possible connections and players can come from users
    async saveConnection(conn:solutionResult){
        console.log("saving connection", conn.title);

        const playerIds = await this.getPlayerIDs(conn);
        console.log("player ids", playerIds);

        const connectionID = await this.getOrInsertDbConnection(conn.title)
        console.log("connection id", connectionID);

        await this.ConnectConnections(playerIds, connectionID);


    }

}
