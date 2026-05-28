import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const media = pgTable('media', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	thumbnailKey: text('thumbnail_key'),
	filename: text('filename').notNull(),
	friendlyName: text('friendly_name').notNull(),
	altText: text('alt_text').notNull().default(''),
	description: text('description').notNull().default(''),
	contentType: text('content_type').notNull(),
	size: integer('size').notNull(),
	uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;