import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moodLogsTable = sqliteTable("mood_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  mood: text("mood").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertMoodLogSchema = createInsertSchema(moodLogsTable).omit({ id: true, createdAt: true });
export type InsertMoodLog = z.infer<typeof insertMoodLogSchema>;
export type MoodLog = typeof moodLogsTable.$inferSelect;
