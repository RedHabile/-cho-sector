import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const highScores = pgTable("high_scores", {
  id: serial("id").primaryKey(),
  callsign: varchar("callsign", { length: 32 }).notNull(),
  operatorClass: varchar("operator_class", { length: 24 }).notNull(),
  score: integer("score").notNull(),
  kills: integer("kills").notNull(),
  placement: integer("placement").notNull(),
  totalPlayers: integer("total_players").notNull().default(10),
  damageDealt: integer("damage_dealt").notNull().default(0),
  survivalSeconds: integer("survival_seconds").notNull().default(0),
  mode: varchar("mode", { length: 24 }).notNull().default("solo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type HighScoreRow = typeof highScores.$inferSelect;
export type NewHighScoreRow = typeof highScores.$inferInsert;
