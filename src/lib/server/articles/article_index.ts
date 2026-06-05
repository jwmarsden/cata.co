import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface ArticleIndex {
	slug: string;
	month: string;
	title: string;
	date: string | null;
	excerpt: string;
	author: string;
	tags: string[];
}

let index: ArticleIndex[] = [];

export async function index_articles(): Promise<void> {
	const articlesDir = path.resolve('src/articles');
	if (!fs.existsSync(articlesDir)) return;

	index = [];

	const months = fs.readdirSync(articlesDir)
		.filter(entry => fs.statSync(path.join(articlesDir, entry)).isDirectory());

	for (const month of months) {
		const monthDir = path.join(articlesDir, month);
		const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.md'));

		for (const filename of files) {
			const raw = fs.readFileSync(path.join(monthDir, filename), 'utf-8');
			const { data } = matter(raw);
			const slug = filename.replace('.md', '');
			console.log(`Indexed article: ${month}/${slug} - ${data.title}`);
			index.push({
				slug,
				month,
				title: data.title ?? 'Untitled',
				date: data.date ? new Date(data.date).toISOString() : null,
				excerpt: data.excerpt ?? '',
				author: data.author ?? 'Unknown',
				tags: data.tags ?? [],
			});
		}
	}

	index.sort((a, b) => {
		if (!a.date) return 1;
		if (!b.date) return -1;
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});
}

export function get_articles(): ArticleIndex[] {
	return index;
}