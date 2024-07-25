"use server";

import type { Port } from "@/app/node-classes";
import {
	agents,
	blueprints,
	db,
	nodes,
	nodesBlueprints,
	ports,
	portsBlueprints,
	requests,
} from "@/drizzle";
import { and, eq, exists, isNotNull, max, sql } from "drizzle-orm";

export type AvailableAgentWithInputPort = {
	id: number;
	name: string | null;
	inputPorts: Port[];
};
export const getAvailableAgentsWithInputPorts = async (): Promise<
	AvailableAgentWithInputPort[]
> => {
	const availableAgentsQuery = db
		.select({
			agentId: blueprints.agentId,
			latestBlueprintId: max(blueprints.id).as("latestBlueprintId"),
		})
		.from(requests)
		.innerJoin(blueprints, eq(blueprints.id, requests.blueprintId))
		.innerJoin(
			agents,
			and(eq(agents.id, blueprints.agentId), isNotNull(agents.name)),
		)
		.where(eq(requests.status, "success"))
		.groupBy(blueprints.agentId)
		.as("availableAgentsQuery");
	const availableAgentInputPorts = await db
		.select({
			agentId: availableAgentsQuery.agentId,
			id: ports.id,
			type: ports.type,
			name: ports.name,
		})
		.from(ports)
		.innerJoin(portsBlueprints, eq(portsBlueprints.portId, ports.id))
		.innerJoin(
			nodesBlueprints,
			eq(nodesBlueprints.id, portsBlueprints.nodesBlueprintsId),
		)
		.innerJoin(
			availableAgentsQuery,
			eq(availableAgentsQuery.latestBlueprintId, nodesBlueprints.blueprintId),
		)
		.innerJoin(
			nodes,
			and(
				eq(nodes.id, nodesBlueprints.nodeId),
				eq(nodes.className, "onRequest"),
			),
		)
		.where(and(eq(ports.direction, "output"), eq(ports.type, "data")));

	const portGroupsByAgentId = availableAgentInputPorts.reduce(
		(acc: { [key: number]: Port[] }, port) => {
			if (!acc[port.agentId]) {
				acc[port.agentId] = [];
			}
			acc[port.agentId].push({
				type: port.type,
				label: port.name,
				key: `${port.id}`,
			});
			return acc;
		},
		{},
	);

	const availableAgents = await db
		.select({ id: agents.id, name: agents.name })
		.from(agents)
		.innerJoin(
			availableAgentsQuery,
			eq(agents.id, availableAgentsQuery.agentId),
		);
	const availableAgentsWithPorts = availableAgents.map((agent) => ({
		...agent,
		inputPorts: portGroupsByAgentId[agent.id] || [],
	}));

	return availableAgentsWithPorts;
};
