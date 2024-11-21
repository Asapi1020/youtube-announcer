import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getFeeds, getNewVideoIDs, getVideoDetails } from "../src/utils";

export default async function handler(
	_req: VercelRequest,
	res: VercelResponse,
) {
	const feeds = await getFeeds([""]);
	const videoIDs = await getNewVideoIDs(feeds, "");
	const videos = await getVideoDetails(videoIDs, "");
	res.status(200).json({ videos });
}
