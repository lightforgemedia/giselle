import { jsonSchema } from "ai";

export const webSearchSchema = jsonSchema<{ plan: string; keywords: string[] }>(
	{
		$schema: "https://json-schema.org/draft/2020-12/schema",
		title: "keyword schema",
		type: "object",
		properties: {
			plan: {
				type: "string",
				description: "Describe the plan that you will archive user request",
			},
			keywords: {
				type: "array",
				items: {
					type: "string",
					description:
						"Suggest appropriate search queries with relevant keywords at least 3-5 words long",
				},
				description: "The keywords to search for user request",
			},
		},
		required: ["plan", "keywords"],
	},
);