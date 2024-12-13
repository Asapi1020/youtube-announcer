import type { VercelRequest, VercelResponse } from "@vercel/node";
import { type Config, MongoDB, setupMongoClient } from "../../../src/mongoDB";
import {
	getChannelDetails,
	getFeeds,
	getNewVideoIDs,
	getVideoDetails,
	notifyError,
	postVideos,
	sortVideos,
} from "../../../src/utils";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	let mongoDB: MongoDB | undefined = undefined;
	let config: Config | undefined = undefined;

	try {
		const mongoClient = await setupMongoClient();
		mongoDB = new MongoDB(mongoClient);
		config = await mongoDB.getConfig("admin");

		const feeds = await getFeeds(config.channelIDs);
		const videoIDs = getNewVideoIDs(feeds, config.lastUpdate);
		if (videoIDs.length === 0) {
			return res.status(200).json({ postedVideos: 0 });
		}

		const videos = await getVideoDetails(videoIDs, config.youtubeAPIKey);
		const sortedVideos = sortVideos(videos);
		const channels = await getChannelDetails(
			config.channelIDs,
			config.youtubeAPIKey,
		);

		for (const video of sortedVideos) {
			const authorChannel = channels.find(
				(channel) => channel.id === video.snippet?.channelId,
			);
			if (authorChannel) {
				await postVideos(video, authorChannel, config.webhookURL);
				config.lastUpdate = video.snippet.publishedAt;
			} else {
				console.error("Failed to find author channel");
			}
		}
		await mongoDB.putConfig(config);

		return res.status(200).json({ postedVideos: sortedVideos.length });
	} catch (error) {
		console.error(error);
		await notifyError(error);
		if (!mongoDB && !config) {
			await mongoDB.putConfig(config);
		}
		return res.status(500).json(error);
	}
}
