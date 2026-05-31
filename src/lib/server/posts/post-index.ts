import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createTag, getTag, updateTag } from '../tags/tag-controller';
import { Tag } from '../tags/tag';

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

export async function index_posts(): Promise<string[]> {

    //console.log(`Index Posts`);

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

    //console.log(`Index Posts: Found ${posts.length} posts`);

    for (const post of posts) {
        //console.log(`Indexing post: ${post.slug} - ${post.title} - Tags: ${post.tags.join(', ')}`);

        for (const tagHash of post.tags) {
            var tag = await getTag(tagHash);
            //console.log(`Processing tag: ${tagHash} - Found in index: ${tag?.toString()}`);
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
                //console.log(`Created tag: ${tag.name} - Occurrences: ${tag.occurrences}`);
            }
        }
        //console.log(`Indexed post: ${post.slug} - ${post.title}`);
    }

    return []
}