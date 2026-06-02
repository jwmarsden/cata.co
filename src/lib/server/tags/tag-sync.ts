import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

import { db } from '$lib/server/db';
import { media } from '$lib/server/db/schema';
import { createTag, deleteAllTags, getTag, updateTag } from './tag-controller';
import { Tag } from './tag';


export async function truncateTags(): Promise<void> {
	console.log('Truncating tags in Redis...');
	await deleteAllTags();
}

function getFilesRecursively(baseDirectory: string, extension?: string, fileDirectory: string = ''): string[] {
    const filePath = path.join(baseDirectory, fileDirectory);

    if (!fs.existsSync(baseDirectory)) return [];

    return fs.readdirSync(filePath).flatMap(file => {
        let fileSuffix;
        if (fileDirectory.trim() === '') {
            fileSuffix = `${file}`;
        } else {
            fileSuffix = path.join(fileDirectory, file);
        }
        const fullPath = path.join(baseDirectory, fileSuffix);
        if (fs.statSync(fullPath).isDirectory()) {
            return getFilesRecursively(baseDirectory, extension, fileSuffix);
        }
        if (extension && !file.endsWith(extension)) return [];
        return [fileSuffix];
    });
}

export async function syncPostTagsToRedis(): Promise<void> {
	console.log('Syncing post tags to Redis...');

    const postsDir = path.resolve('src/posts');
    const files = getFilesRecursively(postsDir, '.md');
    let tags: { [key: string]: number } = {};

    const posts = files.map(filename => {
        const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8');
        
        const { data } = matter(raw);
        return {
            slug: filename.replace('.md', '').replace(/\\/g, '/'),
            title: data.title ?? 'Untitled',
            date: data.date ? new Date(data.date).toISOString() : null,
            excerpt: data.excerpt ?? '',
            tags: data.tags ?? [],
            author: data.author ?? 'Unknown',
        };
    });

    for (const post of posts) {

        for (const tagHash of post.tags) {
            var tag = await getTag(tagHash);
            if (tag) {
                if (!tag.instances.some(i => i.url === `/posts/${post.slug}`)) {
                    tag.instances.push({ type: 'post', url: `/posts/${post.slug}`, description: post.excerpt });
                    tag.occurrences++;
                    await updateTag(tag);
                }
            } else {
                tag = new Tag(tagHash);
                tag.instances.push({ type: 'post', url: `/posts/${post.slug}`, description: post.excerpt });
                tag.occurrences++;
                tag = await createTag(tag);
            }
        }
    }
	console.log(`Synced post tags to Redis`);
}

export async function syncMediaTagsToRedis(): Promise<void> {
	console.log('Syncing media tags to Redis...');

	const allMedia = await db.select({
		id: media.id,
		friendlyName: media.friendlyName,
		tags: media.tags,
		key: media.key,
	}).from(media);

	for (const item of allMedia) {
		const tags: string[] = JSON.parse(item.tags ?? '[]');
		const url = `/api/media/${item.id}?redirect=true`;
		const description = item.friendlyName;

		for (const tagHash of tags) {
			var tag = await getTag(tagHash);
			if (tag) {
                if (!tag.instances.some(i => i.url === url)) {
                    tag.instances.push({ type: 'media', url: url, description: description });
                    tag.occurrences++;
                    await updateTag(tag);
                }
            } else {
                tag = new Tag(tagHash);
                tag.instances.push({ type: 'media', url: url, description: description });
                tag.occurrences++;
                tag = await createTag(tag);
            }
		}
	}

	console.log(`Synced media tags to Redis`);
}