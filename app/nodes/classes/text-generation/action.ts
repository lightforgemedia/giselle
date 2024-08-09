"use server";

import { leaveMessage } from "@/app/agents/requests";
import { db, pullMessages } from "@/drizzle";
import { logger, wait } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import OpenAI from "openai";
import type { Action } from "../../type";

const openai = new OpenAI();

type AssertContent = (value: unknown) => asserts value is string;
const asssertContent: AssertContent = (value) => {};

export const action: Action = async ({ request, id, node }) => {
	logger.log(`params: ${JSON.stringify({ request, id })}`);

	const messages = await db
		.with(pullMessages)
		.select()
		.from(pullMessages)
		.where(
			and(
				eq(pullMessages.requestId, request.id),
				eq(pullMessages.nodeId, node.id),
			),
		);
	const instructionMessage = messages.find(
		({ nodeClassKey }) => nodeClassKey === "instruction",
	);
	if (instructionMessage == null) {
		logger.log(
			`instruction message not found in messages: ${JSON.stringify(messages)}`,
		);
	} else {
		const content = instructionMessage.content;
		asssertContent(content);
		const completion = await openai.chat.completions.create({
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content },
			],
			model: "gpt-4o-mini",
		});
		logger.log(`completion: ${JSON.stringify(completion)}`);
		await leaveMessage({
			requestId: request.id,
			port: { nodeClassKey: "result" },
			stepId: id,
			message: completion.choices[0].message.content ?? "",
		});
	}
};
