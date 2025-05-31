import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Movie recommendation schemas
export const movieRecommendationRequestSchema = z.object({
  moods: z.record(z.string(), z.number().min(0).max(10)),
  recommendationType: z.enum(['match', 'change']).optional().default('match'),
  page: z.number().min(1).optional().default(1)
});

export type MoodVector = Record<string, number>;

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: string[];
}

export interface MovieRecommendation {
  movie: Movie;
  score: number;
  reason: string;
}
