import { type Payload, sendMessage } from "@asp1020/discord-webhook-client";
import { isObject } from "@asp1020/type-utils";

export const notifyError = async (error: unknown) => {
	const notificationURL = process.env.NOTIFICATION_URL;

	if (!notificationURL) {
		console.error("Not found notification webhook URL");
		return;
	}

	const errorMessage = error instanceof Error ? error.message : isObject(error) ? JSON.stringify(error) : String(error);

	const payload: Payload = {
		embeds: [
			{
				title: "Youtube Announcer Error",
				description: errorMessage,
				color: 0xff0000,
			},
		],
	};

	const response = await sendMessage(notificationURL, payload);

	if (!response.ok) {
		console.error("Failed to post error notification");
	}
};
