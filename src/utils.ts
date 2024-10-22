import { google, type youtube_v3 } from "googleapis";
import Parser from "rss-parser";
import type { DiscordWebhookPayload, Feed } from "./type";

export const getFeed = async (channelID: string): Promise<Feed> => {
	const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelID}`;
	const parser = new Parser();
	const feed = await parser.parseURL(rssUrl);
	return feed;
};

export const getFeeds = async (channelIDs: string[]): Promise<Feed[]> => {
	const feedPromises = channelIDs.map((channelID) => getFeed(channelID));
	const feeds = await Promise.all(feedPromises);
	return feeds;
};

export const getNewVideoIDs = (feeds: Feed[], lastUpdate: string): string[] => {
	const newFeeds = feeds.map((feed) => {
		return lastUpdate
			? feed.items.filter((item) => {
					const publishedDate = new Date(item.pubDate as string);
					return publishedDate > new Date(lastUpdate);
				})
			: feed.items;
	});

	const videoIDs = newFeeds.flatMap((feed) => {
		return feed.map((item) => {
			const splitID = item.id.split("yt:video:");
			return splitID.length > 1 ? splitID[1] : "";
		});
	});

	return videoIDs;
};

export const sortVideos = (
	videos: youtube_v3.Schema$Video[],
): youtube_v3.Schema$Video[] => {
	return videos.sort((a, b) => {
		const dateA = new Date(a.snippet.publishedAt).getTime();
		const dateB = new Date(b.snippet.publishedAt).getTime();
		return dateA - dateB;
	});
};

export const getVideoDetails = async (
	videoIDs: string[],
	youtubeAPIKey: string,
): Promise<youtube_v3.Schema$Video[]> => {
	const youtube = google.youtube({
		version: "v3",
		auth: youtubeAPIKey,
	});

	const response = await youtube.videos.list({
		part: ["snippet", "status", "liveStreamingDetails"],
		id: videoIDs,
	});

	if (!response.data.items || response.data.items.length === 0) {
		throw new Error("Not Found");
	}

	return response.data.items;
};

export const getChannelDetails = async (
	channelIDs: string[],
	youtubeAPIKey: string,
): Promise<youtube_v3.Schema$Channel[]> => {
	const youtube = google.youtube({
		version: "v3",
		auth: youtubeAPIKey,
	});

	const response = await youtube.channels.list({
		part: ["snippet"],
		id: channelIDs,
	});

	if (!response.data.items || response.data.items.length === 0) {
		throw new Error("Not Found");
	}

	return response.data.items;
};

export const postVideos = async (
	video: youtube_v3.Schema$Video,
	channel: youtube_v3.Schema$Channel,
	webhookURL: string,
): Promise<void> => {
	if (!webhookURL) {
		throw new Error("Internal Server Error: Undefined Webhook URL");
	}

	const payload: DiscordWebhookPayload = {
		embeds: [
			{
				author: {
					name: video.snippet?.channelTitle,
					url: channel.id
						? `https://www.youtube.com/channel/${channel.id}`
						: undefined,
					icon_url: channel.snippet?.thumbnails?.default?.url,
				},
				title: video.snippet?.title,
				url: video.id
					? `https://www.youtube.com/watch?v=${video.id}`
					: undefined,
				description: video.snippet?.description,
				image: {
					url: video.snippet?.thumbnails?.high.url,
				},
				color: 0xff0000,
				timestamp: video.snippet?.publishedAt,
			},
		],
	};

	const response = await fetch(webhookURL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error("Failed to post video");
	}
};
