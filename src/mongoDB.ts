import { type Collection, type Db, MongoClient } from "mongodb";

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

export class MongoDB {
	private db: Db;
	private collection: Table;

	public constructor(client: MongoClient) {
		if (!process.env.DB_NAME) {
			throw new Error("DB name is undefined");
		}
		this.db = client.db(process.env.DB_NAME);
		this.collection = {
			config: this.db.collection("config"),
		};
	}

	public async getConfig(userID: string): Promise<Config> {
		const config = await this.collection.config.findOne({ userID });
		return config;
	}

	public async putConfig(config: Config) {
		await this.collection.config.updateOne(
			{ userID: config.userID },
			{ $set: config },
		);
	}
}

export const setupMongoClient = async (): Promise<MongoClient> => {
	const mongoUri = process.env.MONGO_DB_URI;

	if (!mongoUri) {
		throw new Error("There is no Mongo URI");
	}

	const client = new MongoClient(mongoUri);
	return client.connect();
};
