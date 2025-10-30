CREATE TABLE "connections" (
	"connectionid" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "connections_description_unique" UNIQUE("description"),
	CONSTRAINT "unique_description" UNIQUE("description")
);
--> statement-breakpoint
CREATE TABLE "connectiontoplayer" (
	"connectionid" integer NOT NULL,
	"playerid" integer NOT NULL,
	CONSTRAINT "connectiontoplayer_connectionid_playerid_pk" PRIMARY KEY("connectionid","playerid")
);
--> statement-breakpoint
CREATE TABLE "draftinfo" (
	"playerid" integer NOT NULL,
	"draftyear" integer NOT NULL,
	"round" integer NOT NULL,
	"pick" integer NOT NULL,
	"draftedbyid" integer NOT NULL,
	CONSTRAINT "draftinfo_pkey" PRIMARY KEY("playerid","draftyear")
);
--> statement-breakpoint
CREATE TABLE "franchise" (
	"franchiseid" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"abbreviation" varchar(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"playerid" serial PRIMARY KEY NOT NULL,
	"firstname" varchar(100) NOT NULL,
	"lastname" varchar(100) NOT NULL,
	"nationality" varchar(100),
	"position" varchar(50),
	"isactive" boolean DEFAULT true,
	"birthdate" date NOT NULL,
	"nbaid" integer,
	CONSTRAINT "players_nbaid_unique" UNIQUE("nbaid")
);
--> statement-breakpoint
ALTER TABLE "connectiontoplayer" ADD CONSTRAINT "connectiontoplayer_connectionid_connections_connectionid_fk" FOREIGN KEY ("connectionid") REFERENCES "public"."connections"("connectionid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectiontoplayer" ADD CONSTRAINT "connectiontoplayer_playerid_players_playerid_fk" FOREIGN KEY ("playerid") REFERENCES "public"."players"("playerid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draftinfo" ADD CONSTRAINT "draftinfo_draftedbyid_franchise_franchiseid_fk" FOREIGN KEY ("draftedbyid") REFERENCES "public"."franchise"("franchiseid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "franchise_name_city_uq" ON "franchise" USING btree ("name","city");--> statement-breakpoint
CREATE UNIQUE INDEX "players_first_last_birthdate_uq" ON "players" USING btree ("firstname","lastname","birthdate");