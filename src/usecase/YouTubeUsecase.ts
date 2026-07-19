import { type Payload, sendMessage } from "@asp1020/discord-webhook-client";
import type { youtube_v3 } from "googleapis";
import type { RSS } from "../domain";
import type { MongoDB, YouTubeRepository } from "../infra";

export class YouTubeUsecase {
	constructor(
		private youtubeRepository: YouTubeRepository,
		private mongoDB: MongoDB,
	) {
		this.youtubeRepository = youtubeRepository;
		this.mongoDB = mongoDB;
	}

	public async checkYouTube(): Promise<number> {
		const config = await this.mongoDB.getConfig("admin").catch(onError("#getConfig"));

		const feeds = await this.youtubeRepository.getFeeds(config.channelIDs).catch(onError("#getFeeds"));

		const videoIDs = this.getNewVideoIDs(feeds, config.lastUpdate);
		if (videoIDs.length === 0) {
			return 0;
		}

		const videos = await this.youtubeRepository.getVideoDetails(videoIDs, config.youtubeAPIKey).catch(onError("#getVideoDetails"));
		const sortedVideos = this.sortVideos(videos);

		const channels = await this.youtubeRepository.getChannelDetails(config.channelIDs, config.youtubeAPIKey).catch(onError("#getChannelDetails"));

		for (const video of sortedVideos) {
			const authorChannel = channels.find((channel) => channel.id === video.snippet?.channelId);
			if (!authorChannel) {
				console.error("Failed to find author channel");
				continue;
			}

			await this.postVideos(video, authorChannel, config.webhookURL).catch(async (error: unknown) => {
				console.error(error);
				await this.mongoDB.putConfig(config).catch(onError("#putConfig"));
				throw new Error(error instanceof Error ? `${error.message} - Failed to post video` : "Failed to post video");
			});

			const lastUpdate = video.snippet?.publishedAt;
			if (!lastUpdate) {
				console.error("Failed to get lastUpdate");
				continue;
			}

			config.lastUpdate = lastUpdate;
		}

		await this.mongoDB.putConfig(config).catch(onError("#putConfig"));

		return sortedVideos.length;
	}

	private getNewVideoIDs(feeds: RSS.Feed[], lastUpdate: string): string[] {
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
	}

	private sortVideos(videos: youtube_v3.Schema$Video[]): youtube_v3.Schema$Video[] {
		return videos.sort((a, b) => {
			const dateA = new Date(a.snippet?.publishedAt ?? 0).getTime();
			const dateB = new Date(b.snippet?.publishedAt ?? 0).getTime();
			return dateA - dateB;
		});
	}

	private async postVideos(
		video: youtube_v3.Schema$Video,
		channel: youtube_v3.Schema$Channel,
		webhookURL: string,
	): Promise<void> {
		if (!webhookURL) {
			throw new Error("Internal Server Error: Undefined Webhook URL");
		}

		const imageURL = video.snippet?.thumbnails?.maxres?.url ?? video.snippet?.thumbnails?.high?.url;

		const payload: Payload = {
			content: this.youtubeLiveNotification(video.liveStreamingDetails),
			embeds: [
				{
					author: {
						name: video.snippet?.channelTitle ?? "Unknown Channel",
						url: channel.id ? `https://www.youtube.com/channel/${channel.id}` : undefined,
						icon_url: channel.snippet?.thumbnails?.default?.url ?? undefined,
					},
					title: video.snippet?.title ?? undefined,
					url: video.id ? `https://www.youtube.com/watch?v=${video.id}` : undefined,
					description: video.snippet?.description ?? undefined,
					image: imageURL ? { url: imageURL } : undefined,
					color: 0xff0000,
					timestamp: video.snippet?.publishedAt ?? undefined,
				},
			],
		};

		const response = await sendMessage(webhookURL, payload);

		if (!response.ok) {
			console.error(payload);
			throw new Error("Failed to post video");
		}
	}

	private youtubeLiveNotification(
		liveStreamingDetails: youtube_v3.Schema$VideoLiveStreamingDetails | undefined,
	): string | undefined {
		if (!liveStreamingDetails) {
			return undefined;
		}

		if (!liveStreamingDetails.actualStartTime) {
			return liveStreamingDetails.scheduledStartTime
			? `配信が <t:${this.getUnixTimeStamp(liveStreamingDetails.scheduledStartTime)}:F> に公開予定です！`
			: "配信が公開予定です！";
		}

		if (!liveStreamingDetails.actualEndTime) {
			return "現在配信中です！";
		}

		return "配信のアーカイブが公開されています！";
	}

	private getUnixTimeStamp = (isoTime: string): number => {
		const date = new Date(isoTime);
		return Math.floor(date.getTime() / 1000);
	};
}


function onError(error: unknown): (id: string) => never {
	return (id: string): never => {
		const errorMessage = error instanceof Error ? error.message : String(error);

		throw new Error(`${id} - ${errorMessage}`);
	};
}
