import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getFeeds, getNewVideoIDs, getVideoDetails, notifyError } from "../src/utils";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
	await notifyError("Test String Error notification");
	await notifyError({
		title: "test json error notification",
		description: "this is a test",
	});
	res.status(200).json("success");
}
