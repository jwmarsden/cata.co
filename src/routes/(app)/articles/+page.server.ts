import { get_articles } from '$lib/server/articles/article_index';

export async function load() {
	return { articles: get_articles() };
}