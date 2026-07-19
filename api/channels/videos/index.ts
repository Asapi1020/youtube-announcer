import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient } from "mongodb";
import { MongoDB, YouTubeRepository } from "../../../src/infra";
import { YouTubeUsecase, notifyError } from "../../../src/usecase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	try {
		const dbName = process.env.DB_NAME;
		if (!dbName) {
			res.status(500).json({ message: "There is no DB name" });
			return;
		}
		const mongoUri = process.env.MONGO_DB_URI;
		if (!mongoUri) {
			res.status(500).json({ message: "There is no Mongo URI" });
			return;
		}

		const mongoClient = await new MongoClient(mongoUri).connect();
		const mongoDB = new MongoDB(mongoClient, dbName);
		const youtubeRepository = new YouTubeRepository();
		const usecase = new YouTubeUsecase(youtubeRepository, mongoDB);

		const postedVideos = await usecase.checkYouTube();

		return res.status(200).json({ postedVideos });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		console.error(error);
		await notifyError(error).catch(console.error);
		return res.status(500).json({ message: errorMessage });
	}
}
