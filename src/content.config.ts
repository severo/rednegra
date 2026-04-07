import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: () =>
		z.object({
			title: z.string(),
			description: z.string(),
			language: z.enum(['en', 'es-BO']).optional(),
			pubDate: z.coerce.date(),
		}),
});

const tags = defineCollection({
	loader: glob({ base: './src/content/tags', pattern: '*.{md,mdx}' }),
	schema: () =>
		z.object({
			name: z.string(),
		}),
});

const references = defineCollection({
	loader: glob({ base: './src/content/references', pattern: '*.{md,mdx}' }),
	schema: () =>
		z.object({
			name: z.string(),
			url: z.url(),
		}),
});

const works = defineCollection({
	loader: glob({ base: './src/content/works', pattern: '*.{md,mdx}' }),
	schema: () =>
		z.object({
			title: z.string(),
			description: z.string(),
			references: z.array(reference('references')).optional(),
		}),
});

const images = defineCollection({
	loader: file('./src/content/images/_index.json'),
	schema: ({image}) =>
		z.object({
			work: reference('works'),
			id: image(),
			alt: z.string(),
			title: z.string().optional(),
			tags: z.array(reference('tags')).optional(),
		}),
});

export const collections = { blog, works, images, references, tags };
