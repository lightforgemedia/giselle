import type { RequestStepStatus, RunStatus } from "@/drizzle/schema";

export type RequestStep = {
	id: number;
	node: {
		id: number;
		type: string;
	};
	status: RequestStepStatus;
	run: {
		id: number;
	};
};

export type AgentRequest = {
	request: {
		blueprint: {
			id: number;
		};
		id: number;
		status: RunStatus;
		steps: Array<RequestStep>;
	};
};

type AssertAgentRequest = (value: unknown) => asserts value is AgentRequest;
/**
 * @todo Implement this function
 */
export const assertAgentRequest: AssertAgentRequest = (value) => {
	return;
};
