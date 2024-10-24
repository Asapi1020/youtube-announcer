import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoDB, setupMongoClient } from "../../../src/mongoDB";
import {
	getChannelDetails,
	getFeeds,
	getNewVideoIDs,
	getVideoDetails,
	postVideos,
	sortVideos,
} from "../../../src/utils";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	try {
		const mongoClient = await setupMongoClient();
		const mongoDB = new MongoDB(mongoClient);
		const config = await mongoDB.getConfig("admin");

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
			} else {
				console.error("Failed to find author channel");
			}
		}

		const lastUpdate =
			sortedVideos[sortedVideos.length - 1].snippet.publishedAt;
		config.lastUpdate = lastUpdate;
		await mongoDB.putConfig(config);

		return res.status(200).json({ postedVideos: sortedVideos.length });
	} catch (error) {
		console.error(error);
		return res.status(500).json(error);
	}
}
