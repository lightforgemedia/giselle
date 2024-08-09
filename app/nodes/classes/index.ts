import invariant from "tiny-invariant";
import type { NodeClass } from "../type";
import * as onRequest from "./on-request";
export * from "../type";

export const nodeClasses = [onRequest] satisfies NodeClass[];

export type NodeClassName = (typeof nodeClasses)[number]["name"];

type GetNodeClassArgs = {
	name: string;
};
export const getNodeClass = (args: GetNodeClassArgs) => {
	const nodeClass = nodeClasses.find(
		(nodeClass) => nodeClass.name === args.name,
	);
	invariant(nodeClass != null, `Node class not found: ${args.name}`);
	return nodeClass;
};
