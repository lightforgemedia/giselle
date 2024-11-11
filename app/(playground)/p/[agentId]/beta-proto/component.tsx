"use client";

import "@xyflow/react/dist/style.css";
import { AgentNameProvider } from "./contexts/agent-name";
import { Editor } from "./editor";
import { FeatureFlagProvider } from "./feature-flags/provider";
import type { FeatureFlags } from "./feature-flags/types";
import { useGraph } from "./graph/context";
import { GraphProvider } from "./graph/provider";
import { type Graph, playgroundModes } from "./graph/types";
import type { AgentId } from "./types";
import { Viewer } from "./viewer";

function Inner() {
	const { state } = useGraph();
	if (state.graph.mode === playgroundModes.edit) {
		return <Editor />;
	}
	return <Viewer />;
}

interface PlaygroundProps {
	agentId: AgentId;
	agentName: string;
	graph: Graph;
	featureFlags: FeatureFlags;
}
export function Playground(props: PlaygroundProps) {
	return (
		<FeatureFlagProvider {...props.featureFlags}>
			<AgentNameProvider initialName={props.agentName}>
				<GraphProvider agentId={props.agentId} defaultGraph={props.graph}>
					<Inner />
				</GraphProvider>
			</AgentNameProvider>
		</FeatureFlagProvider>
	);
}
