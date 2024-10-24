import type Parser from "rss-parser";

export type Feed = {
	// biome-ignore lint/suspicious/noExplicitAny: this is expected any
	[key: string]: any;
} & Parser.Output<{
	// biome-ignore lint/suspicious/noExplicitAny: this is expected any
	[key: string]: any;
}>;

export interface DiscordWebhookPayload {
	embeds: {
		author: {
			name: string | null | undefined;
			url: string | null | undefined;
			icon_url: string | null | undefined;
		};
		title: string | null | undefined;
		url: string | null | undefined;
		description: string | null | undefined;
		image: {
			url: string | null | undefined;
		};
		color: number;
		timestamp: string | null | undefined;
	}[];
}
