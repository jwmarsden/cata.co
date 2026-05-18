import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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

export async function load() {
	const postsDir = path.resolve('src/posts');
	const files = getFilesRecursively(postsDir, '.md');

	const posts = files.map(filename => {
		const raw = fs.readFileSync(path.join(postsDir, filename), 'utf-8');
		
		const { data } = matter(raw);
		return {
			slug: filename.replace('.md', ''),
			title: data.title ?? 'Untitled',
			date: data.date ? new Date(data.date).toISOString() : null,
			excerpt: data.excerpt ?? '',
		};
	});

	// Sort newest first
	posts.sort((a, b) => {
		if (!a.date) return 1;
		if (!b.date) return -1;
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	return { posts };
}