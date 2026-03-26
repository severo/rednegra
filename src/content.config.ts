import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: () =>
		z.object({
			title: z.string(),
			pubDate: z.coerce.date(),
		}),
});

const tags = defineCollection({
	loader: file('./src/content/tags.json'),
	schema: z.object({
		name: z.string(),
	}),
});

const references = defineCollection({
	loader: file('./src/content/references.json'),
	schema: z.object({
		name: z.string(),
		tags: z.array(reference('tags')).optional(),
	}),
});

const activities = defineCollection({
	loader: glob({ base: './src/content/activities', pattern: '**/*.{md,mdx}' }),
	schema: () =>
		z.object({
			title: z.string(),
			reference: reference('references'),
			tags: z.array(reference('tags')).optional(),
		}),
});

const portfolio = defineCollection({
	loader: file('./src/content/portfolio.json'),
	schema: ({image}) =>
		z.object({
			activity: reference('activities'),
			image: image(),
			alt: z.string(),
			tags: z.array(reference('tags')).optional(),
		}),
});

export const collections = { blog , activities, portfolio, references, tags };
