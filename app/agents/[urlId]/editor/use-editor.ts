import { type AgentRequest, useRequest } from "@/app/agents/requests";
import { type NodeType, findNodeDef, useNodeDefs } from "@/app/node-defs";
import { useCallback, useMemo } from "react";
import type { Edge, Node } from "reactflow";
import invariant from "tiny-invariant";
import { useBlueprint } from "../blueprints";
import { NodeTypes } from "../node";
import { execApi as execAddEdgeApi } from "./edges/add-edge";
import { execApi as execDeleteEdgeApi } from "./edges/delete-edge";
import { createDraftNode, execApi as execAddNodeApi } from "./nodes/add-node";
import { execApi as execDeleteNodeApi } from "./nodes/delete-node";

type EditorState = {
	nodes: Node[];
	edges: Edge[];
};
type AddNodeArgs = {
	nodeType: NodeType;
	position: { x: number; y: number };
};
type DeleteNodesArgs = number[];
type ConnectNodesArgs = {
	originPort: {
		id: number;
		nodeId: number;
	};
	destinationPort: {
		id: number;
		nodeId: number;
	};
};
type DeleteEdgesArgs = number[];
export const useEditor = (request: AgentRequest["request"] | undefined) => {
	const { mutateBlueprint, blueprint } = useBlueprint();
	const { nodeDefs } = useNodeDefs();
	const editorState = useMemo<EditorState>(() => {
		if (blueprint == null) {
			return { nodes: [], edges: [] };
		}
		const nodes = blueprint.nodes.map((node) => {
			const relevantRequestStep = request?.steps.find(
				(step) => step.node.id === node.id,
			);
			console.log(relevantRequestStep);
			return {
				id: `${node.id}`,
				type: NodeTypes.V3,
				position: node.position,
				data: {
					id: `${node.id}`,
					nodeType: node.type,
					stepStatus: relevantRequestStep?.status,
					inputPorts: node.inputPorts,
					outputPorts: node.outputPorts,
				},
			};
		});
		const edges = blueprint.edges.map(({ id, inputPort, outputPort }) => ({
			id: `${id}`,
			source: `${outputPort.nodeId}`,
			sourceHandle: `${outputPort.id}`,
			target: `${inputPort.nodeId}`,
			targetHandle: `${inputPort.id}`,
		}));
		return { nodes, edges };
	}, [blueprint, request]);

	const addNode = useCallback(
		({ nodeType, position }: AddNodeArgs) => {
			if (blueprint == null) {
				return;
			}
			if (nodeDefs == null) {
				return;
			}
			const nodeDef = findNodeDef(nodeDefs, nodeType);
			const draftNode = createDraftNode({
				id: blueprint.nodes.length + 1,
				nodeType,
				nodeDef,
				position,
			});
			mutateBlueprint(
				(prev) =>
					execAddNodeApi(blueprint, draftNode).then(({ node }) => {
						invariant(prev != null, "invalid state: blueprint is null");
						return {
							blueprint: {
								...prev.blueprint,
								nodes: [...prev.blueprint.nodes, node],
							},
						};
					}),
				{
					revalidate: false,
					optimisticData: (prev) => {
						invariant(prev != null, "invalid state: blueprint is null");
						return {
							blueprint: {
								...prev.blueprint,
								nodes: [...prev.blueprint.nodes, draftNode],
							},
						};
					},
				},
			);
		},
		[blueprint, mutateBlueprint, nodeDefs],
	);

	const deleteNodes = useCallback(
		(deleteNodeIds: DeleteNodesArgs) => {
			if (blueprint == null) {
				return;
			}
			mutateBlueprint(
				(prev) =>
					execDeleteNodeApi(blueprint, deleteNodeIds).then(
						({ deletedNodeIds }) => {
							invariant(prev != null, "invalid state: blueprint is null");
							return {
								blueprint: {
									...prev.blueprint,
									nodes: prev.blueprint.nodes.filter(
										(node) => !deletedNodeIds.includes(node.id),
									),
								},
							};
						},
					),
				{
					revalidate: false,
					optimisticData: (prev) => {
						invariant(prev != null, "invalid state: blueprint is null");
						return {
							blueprint: {
								...prev.blueprint,
								nodes: prev.blueprint.nodes.filter(
									(node) => !deleteNodeIds.includes(node.id),
								),
							},
						};
					},
				},
			);
		},
		[blueprint, mutateBlueprint],
	);

	const connectNodes = useCallback(
		({ originPort, destinationPort }: ConnectNodesArgs) => {
			if (blueprint == null) {
				return;
			}
			mutateBlueprint(
				(prev) =>
					execAddEdgeApi(blueprint, {
						originPortId: originPort.id,
						destinationPortId: destinationPort.id,
					}).then(({ edge }) => {
						invariant(prev != null, "invalid state: blueprint is null");
						return {
							blueprint: {
								...prev.blueprint,
								edges: [...prev.blueprint.edges, edge],
							},
						};
					}),
				{
					revalidate: false,
					optimisticData: (prev) => {
						invariant(prev != null, "invalid state: blueprint is null");
						return {
							blueprint: {
								...prev.blueprint,
								edges: [
									...prev.blueprint.edges,
									{
										id: prev.blueprint.edges.length + 1,
										edgeType: "data",
										inputPort: destinationPort,
										outputPort: originPort,
									},
								],
							},
						};
					},
				},
			);
		},
		[blueprint, mutateBlueprint],
	);

	const deleteEdges = useCallback(
		(deleteEdgeIds: DeleteEdgesArgs) => {
			if (blueprint == null) {
				return;
			}
			mutateBlueprint(
				(prev) =>
					execDeleteEdgeApi(blueprint, deleteEdgeIds).then(
						({ deletedEdgeIds }) => {
							invariant(prev != null, "invalid state: blueprint is null");
							return {
								blueprint: {
									...prev.blueprint,
									edges: prev.blueprint.edges.filter(
										(edge) => !deletedEdgeIds.includes(edge.id),
									),
								},
							};
						},
					),
				{
					revalidate: false,
					optimisticData: (prev) => {
						invariant(prev != null, "invalid state: blueprint is null");
						return {
							blueprint: {
								...prev.blueprint,
								edges: prev.blueprint.edges.filter(
									(edge) => !deleteEdgeIds.includes(edge.id),
								),
							},
						};
					},
				},
			);
		},
		[blueprint, mutateBlueprint],
	);

	return {
		editorState,
		addNode,
		deleteNodes,
		connectNodes,
		deleteEdges,
	};
};
