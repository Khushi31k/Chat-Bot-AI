import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const habitsTable = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("⭐"),
  color: text("color").notNull().default("#6366f1"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const habitLogsTable = sqliteTable("habit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  habitId: integer("habit_id").notNull(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
}, (t) => [unique("habit_log_unique").on(t.habitId, t.date)]);

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habitsTable.$inferSelect;

export const insertHabitLogSchema = createInsertSchema(habitLogsTable).omit({ id: true });
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
export type HabitLog = typeof habitLogsTable.$inferSelect;
