import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	getChannelDetails,
	getFeeds,
	getNewVideoIDs,
	getVideoDetails,
	postVideos,
	sortVideos,
} from "../../../src/utils";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const { channelIDs, lastUpdate } = req.body;

	if (!channelIDs) {
		return res
			.status(400)
			.json({ error: "Invalid channelIds", requestBody: req.body });
	}

	try {
		const feeds = await getFeeds(channelIDs);
		const videoIDs = getNewVideoIDs(
			feeds,
			lastUpdate && typeof lastUpdate === "string" ? lastUpdate : undefined,
		);
		const videos = await getVideoDetails(videoIDs);
		const sortedVideos = sortVideos(videos);
		const channels = await getChannelDetails(channelIDs);

		for (const video of sortedVideos) {
			const authorChannel = channels.find(
				(channel) => channel.id === video.snippet?.channelId,
			);
			if (authorChannel) {
				await postVideos(video, authorChannel);
			} else {
				console.error("Failed to find author channel");
			}
		}

		const lastPublishedAt =
			sortVideos[sortVideos.length - 1].snippet.publishedAt;
		res.status(200).json({ lastUpdate: lastPublishedAt });
	} catch (error) {
		console.error("Error fetching RSS feed:", error);
		res.status(500).json(error);
	}
}
