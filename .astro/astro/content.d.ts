declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"case-studies": {
"144k-collective.md": {
	id: "144k-collective.md";
  slug: "144k-collective";
  body: string;
  collection: "case-studies";
  data: any
} & { render(): Render[".md"] };
"equity-guardians.md": {
	id: "equity-guardians.md";
  slug: "equity-guardians";
  body: string;
  collection: "case-studies";
  data: any
} & { render(): Render[".md"] };
"ghana-market-entry.md": {
	id: "ghana-market-entry.md";
  slug: "ghana-market-entry";
  body: string;
  collection: "case-studies";
  data: any
} & { render(): Render[".md"] };
"imused.md": {
	id: "imused.md";
  slug: "imused";
  body: string;
  collection: "case-studies";
  data: any
} & { render(): Render[".md"] };
"masters-chair.md": {
	id: "masters-chair.md";
  slug: "masters-chair";
  body: string;
  collection: "case-studies";
  data: any
} & { render(): Render[".md"] };
"us-market-entry.md": {
	id: "us-market-entry.md";
  slug: "us-market-entry";
  body: string;
  collection: "case-studies";
  data: any
} & { render(): Render[".md"] };
};
"library": {
"144k-the-math-behind-the-cap.md": {
	id: "144k-the-math-behind-the-cap.md";
  slug: "144k-the-math-behind-the-cap";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"decision-maker-briefing.md": {
	id: "decision-maker-briefing.md";
  slug: "decision-maker-briefing";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"equity-guardians-collective-bargaining.md": {
	id: "equity-guardians-collective-bargaining.md";
  slug: "equity-guardians-collective-bargaining";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"from-2011-to-2026.md": {
	id: "from-2011-to-2026.md";
  slug: "from-2011-to-2026";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"ghana-the-engine-reading.md": {
	id: "ghana-the-engine-reading.md";
  slug: "ghana-the-engine-reading";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"imused-compliant-by-design.md": {
	id: "imused-compliant-by-design.md";
  slug: "imused-compliant-by-design";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"the-counterfactual-pause.md": {
	id: "the-counterfactual-pause.md";
  slug: "the-counterfactual-pause";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"the-foundation-dossier.md": {
	id: "the-foundation-dossier.md";
  slug: "the-foundation-dossier";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"the-shape-of-the-firm.md": {
	id: "the-shape-of-the-firm.md";
  slug: "the-shape-of-the-firm";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"the-three-engines.md": {
	id: "the-three-engines.md";
  slug: "the-three-engines";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"twenty-two-gates.md": {
	id: "twenty-two-gates.md";
  slug: "twenty-two-gates";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
"why-90-percent.md": {
	id: "why-90-percent.md";
  slug: "why-90-percent";
  body: string;
  collection: "library";
  data: any
} & { render(): Render[".md"] };
};
"track-record": {
"2001-employee-advocacy.md": {
	id: "2001-employee-advocacy.md";
  slug: "2001-employee-advocacy";
  body: string;
  collection: "track-record";
  data: any
} & { render(): Render[".md"] };
"2003-crowd-powered.md": {
	id: "2003-crowd-powered.md";
  slug: "2003-crowd-powered";
  body: string;
  collection: "track-record";
  data: any
} & { render(): Render[".md"] };
"2008-verses.md": {
	id: "2008-verses.md";
  slug: "2008-verses";
  body: string;
  collection: "track-record";
  data: any
} & { render(): Render[".md"] };
"2009-surprise-box.md": {
	id: "2009-surprise-box.md";
  slug: "2009-surprise-box";
  body: string;
  collection: "track-record";
  data: any
} & { render(): Render[".md"] };
"2010-go-local.md": {
	id: "2010-go-local.md";
  slug: "2010-go-local";
  body: string;
  collection: "track-record";
  data: any
} & { render(): Render[".md"] };
"2017-foundation-venu.md": {
	id: "2017-foundation-venu.md";
  slug: "2017-foundation-venu";
  body: string;
  collection: "track-record";
  data: any
} & { render(): Render[".md"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = never;
}
