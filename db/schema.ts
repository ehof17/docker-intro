import {  text, serial, pgTable, timestamp, primaryKey, 
          varchar, numeric, boolean, integer, unique, uniqueIndex, 
          date} from "drizzle-orm/pg-core";

export const franchise = pgTable("franchise", {
    franchiseid: serial("franchiseid").primaryKey().notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    abbreviation: varchar("abbreviation", { length: 3 }).notNull(),
    }, (t) => ({
  nameCityUq: uniqueIndex("franchise_name_city_uq").on(t.name, t.city),
}));

export const draftInfo = pgTable(
  "draftinfo",
  {
    playerid: integer("playerid").notNull(),
    draftyear: integer("draftyear").notNull(),
    round: integer("round").notNull(),
    pick: integer("pick").notNull(),
    draftedbyid: integer("draftedbyid")
      .notNull()
      .references(() => franchise.franchiseid, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.playerid, t.draftyear], name: "draftinfo_pkey" }),
  })
);

export const players = pgTable("players", {
    playerid: serial("playerid").primaryKey().notNull(),
    firstname: varchar("firstname", { length: 100 }).notNull(),
    lastname: varchar("lastname", { length: 100 }).notNull(),
    nationality: varchar("nationality", { length: 100 }),
    position: varchar("position", { length: 50 }),
    isactive: boolean("isactive").default(true),
    birthdate: date("birthdate", { mode: "date" }).notNull(),
    nbaid: integer("nbaid").unique(),
},
(t) => ({
  nameDobUq: uniqueIndex("players_first_last_birthdate_uq")
    .on(t.firstname, t.lastname, t.birthdate),
})

);


// hard sets at 4 players
export const connections = pgTable(
    "connections",
    {
      connectionid: serial("connectionid").primaryKey().notNull(),
      description: text("description").notNull().unique(),
    },
    (table) => ({
      uniqueDescription: unique("unique_description").on(table.description),
    })
  );

export const connectiontoplayer = pgTable(
    "connectiontoplayer",
    {
      connectionid: integer("connectionid")
        .notNull()
        .references(() => connections.connectionid, { onDelete: "cascade" }),
      playerid: integer("playerid")
        .notNull()
        .references(() => players.playerid, { onDelete: "cascade" }),
    },
    (table: { connectionid: any; playerid: any; }) => ({
      pk: primaryKey({ columns: [table.connectionid, table.playerid] }),
    })
  );
  