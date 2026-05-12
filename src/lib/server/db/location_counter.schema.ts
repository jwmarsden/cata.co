import { pgTable, serial, text, integer, timestamp, index, geometry } from 'drizzle-orm/pg-core';

export const location_counter = pgTable('location_counter', {
  id: serial('id').primaryKey(),
  city: text('city').notNull().unique(),
  country: text('country').notNull(),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  count: integer('count').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('city_idx').on(table.city),
  index('spatial_index').using('gist', table.location),
]);