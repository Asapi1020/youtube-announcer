import type { Db, MongoClient } from "mongodb";
import type { Database } from "../domain";

export class MongoDB {
	private db: Db;
	private collection: Database.Table;

	public constructor(client: MongoClient, dbName: string) {
		this.db = client.db(dbName);
		this.collection = {
			config: this.db.collection("config"),
		};
	}

	public async getConfig(userID: string): Promise<Database.Config> {
		const config = await this.collection.config.findOne({ userID });
		return config;
	}

	public async putConfig(config: Database.Config) {
		await this.collection.config.updateOne(
			{ userID: config.userID },
			{ $set: config },
		);
	}
}
