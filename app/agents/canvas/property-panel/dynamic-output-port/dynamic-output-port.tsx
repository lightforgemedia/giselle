import {
	type Node,
	useAddNodePortAction,
	useBlueprintId,
} from "@/app/agents/blueprints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { AlignLeftIcon, PlusIcon } from "lucide-react";
import { type FC, useCallback, useState } from "react";
import { DynamicOutputPortListItem } from "./dynamic-output-port-list-item";

type DynamicOutputPortProps = {
	node: Node;
};
export const DynamicOutputPort: FC<DynamicOutputPortProps> = ({ node }) => {
	const blueprintId = useBlueprintId();
	const { addNodePort } = useAddNodePortAction();
	const heading = node.className === "onRequest" ? "Parameters" : "Output Port";
	const [disclosure, setDisclosure] = useState(false);
	const handleOpenChange = useCallback(
		(open: boolean) => {
			setDisclosure(open);
			if (open) {
				addNodePort({
					port: {
						nodeId: node.id,
						direction: "output",
						name: "Parameter",
					},
				});
			}
		},
		[addNodePort, node],
	);
	return (
		<div>
			<div className="flex justify-between mb-2 px-4">
				<h3 className="text-sm font-bold">{heading}</h3>
				<div>
					<Popover open={disclosure} onOpenChange={handleOpenChange}>
						<PopoverTrigger asChild>
							<Button size="icon" variant="ghost">
								<PlusIcon className="w-4 h-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end">
							<Input placeholder="Parameter" />
						</PopoverContent>
					</Popover>
				</div>
			</div>
			<div className="flex flex-col gap-1">
				{node.outputPorts
					.filter(({ type }) => type === "data")
					.map((port) => (
						<DynamicOutputPortListItem key={port.id} port={port} />
					))}
			</div>
		</div>
	);
};
