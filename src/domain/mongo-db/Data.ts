import type { Collection } from "mongodb";

export interface Config {
	userID: string;
	channelIDs: string[];
	youtubeAPIKey: string;
	webhookURL: string;
	lastUpdate: string;
}

export interface Table {
	config: Collection<Config>;
}
