import type Parser from "rss-parser";

export type Feed = {
	// biome-ignore lint/suspicious/noExplicitAny: this is expected any
	[key: string]: any;
} & Parser.Output<{
	// biome-ignore lint/suspicious/noExplicitAny: this is expected any
	[key: string]: any;
}>;
