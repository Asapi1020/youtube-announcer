import { google, type youtube_v3 } from "googleapis";
import Parser from "rss-parser";
import type { RSS } from "../domain";

export class YouTubeRepository {
	public async getFeed(channelID: string): Promise<RSS.Feed> {
		const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelID}`;
		const parser = new Parser();
		const feed = await parser.parseURL(rssUrl);
		return feed;
	}

	public async getFeeds(channelIDs: string[]): Promise<RSS.Feed[]> {
		const feedPromises = channelIDs.map((channelID) => this.getFeed(channelID));
		const feeds = await Promise.all(feedPromises);
		return feeds;
	}

	public async getVideoDetails(videoIDs: string[], youtubeAPIKey: string): Promise<youtube_v3.Schema$Video[]> {
		const youtube = google.youtube({
			version: "v3",
			auth: youtubeAPIKey,
		});

		const response = await youtube.videos.list({
			part: ["snippet", "status", "liveStreamingDetails"],
			id: videoIDs,
		});

		if (!response.data.items || response.data.items.length === 0) {
			throw new Error(`Not Found for videoIDs: ${videoIDs.join(", ")}`);
		}

		return response.data.items;
	}

	public async getChannelDetails(channelIDs: string[], youtubeAPIKey: string): Promise<youtube_v3.Schema$Channel[]> {
		const youtube = google.youtube({
			version: "v3",
			auth: youtubeAPIKey,
		});

		const response = await youtube.channels.list({
			part: ["snippet"],
			id: channelIDs,
		});

		if (!response.data.items || response.data.items.length === 0) {
			throw new Error(`Not Found for channelIDs: ${channelIDs.join(", ")}`);
		}

		return response.data.items;
	}
}
