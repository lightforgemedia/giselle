"use server";

import {
	db,
	fileOpenaiFileRepresentations,
	files,
	knowledgeContentOpenaiVectorStoreFileRepresentations,
	knowledgeContents,
	knowledgeOpenaiVectorStoreRepresentations,
	knowledges,
} from "@/drizzle";
import { openai } from "@/lib/openai";
import { eq } from "drizzle-orm";

export const copyKnolwedges = async (
	currentBlueprintId: number,
	newBlueprintId: number,
) => {
	const currentKnowledges = await db
		.select({
			id: knowledges.id,
			name: knowledges.name,
			openaiVectorStoreId:
				knowledgeOpenaiVectorStoreRepresentations.openaiVectorStoreId,
		})
		.from(knowledges)
		.innerJoin(
			knowledgeOpenaiVectorStoreRepresentations,
			eq(knowledgeOpenaiVectorStoreRepresentations.knowledgeId, knowledges.id),
		)
		.where(eq(knowledges.blueprintId, currentBlueprintId));

	for (const currentKnowledge of currentKnowledges) {
		const [newKnolwedge] = await db
			.insert(knowledges)
			.values({
				name: currentKnowledge.name,
				blueprintId: newBlueprintId,
			})
			.returning({ id: knowledges.id });
		const newOpenaiVectorStore = await openai.beta.vectorStores.create({
			name: currentKnowledge.name,
		});
		await db.insert(knowledgeOpenaiVectorStoreRepresentations).values({
			knowledgeId: newKnolwedge.id,
			openaiVectorStoreId: newOpenaiVectorStore.id,
			status: newOpenaiVectorStore.status,
		});
		const currentKnowledgeContents = await db
			.select({
				id: knowledgeContents.id,
				type: knowledgeContents.type,
				fileId: knowledgeContents.fileId,
				name: knowledgeContents.name,
				knowledgeId: knowledgeContents.knowledgeId,
				openaifileId: fileOpenaiFileRepresentations.openaiFileId,
			})
			.from(knowledgeContents)
			.innerJoin(
				fileOpenaiFileRepresentations,
				eq(fileOpenaiFileRepresentations.fileId, files.id),
			)
			.where(eq(knowledgeContents.knowledgeId, currentKnowledge.id));
		for (const currentKnowledgeContent of currentKnowledgeContents) {
			const [newKnowledgeContent] = await db
				.insert(knowledgeContents)
				.values({
					name: currentKnowledgeContent.name,
					type: currentKnowledgeContent.type,
					fileId: currentKnowledgeContent.fileId,
					knowledgeId: currentKnowledgeContent.knowledgeId,
				})
				.returning({ id: knowledgeContents.id });

			const newOpenaiVectorStoreFile =
				await openai.beta.vectorStores.files.create(newOpenaiVectorStore.id, {
					file_id: currentKnowledgeContent.openaifileId,
				});
			await db
				.insert(knowledgeContentOpenaiVectorStoreFileRepresentations)
				.values({
					knowledgeContentId: newKnowledgeContent.id,
					openaiVectorStoreFileId: newOpenaiVectorStoreFile.id,
				});
		}
	}
};
