// web/js/vector-db.js
import { getDataByKey } from "./database.js";

async function getEmbeddings(text) {
    const credentials = localStorage.getItem("mystaff_credentials");
    const apiKey = JSON.parse(credentials || "{}").openai;

    if (!apiKey) {
        throw new Error("OpenAI API key missing for embeddings.");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            input: text,
            model: "text-embedding-3-small",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error.message}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

function chunkText(text, chunkSize = 1000) {
    const chunks = [];
    let currentPos = 0;
    while (currentPos < text.length) {
        chunks.push(text.slice(currentPos, currentPos + chunkSize));
        currentPos += chunkSize;
    }
    return chunks;
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const vectorDB = {
    async ingest(fileId, fileName, text) {
        console.log(`Ingesting file ${fileName} into Vector DB...`);
        const chunks = chunkText(text);
        const vectors = [];

        for (const chunk of chunks) {
            if (!chunk.trim()) continue;
            const embedding = await getEmbeddings(chunk);
            vectors.push({
                text: chunk,
                embedding: embedding,
                fileName: fileName,
                fileId: fileId,
            });
        }

        // Save to OPFS
        const root = await navigator.storage.getDirectory();
        const vectorDir = await root.getDirectoryHandle("vectors", { create: true });
        const fileHandle = await vectorDir.getFileHandle(`${fileId}.json`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(vectors));
        await writable.close();

        console.log(`File ${fileName} ingested successfully.`);
    },

    async search(query, topK = 5, fileIds = []) {
        const queryEmbedding = await getEmbeddings(query);
        const root = await navigator.storage.getDirectory();
        const vectorDir = await root.getDirectoryHandle("vectors", { create: true });

        let allVectors = [];

        if (fileIds.length > 0) {
            for (const fileId of fileIds) {
                try {
                    const fileHandle = await vectorDir.getFileHandle(`${fileId}.json`);
                    const file = await fileHandle.getFile();
                    const text = await file.text();
                    const vectors = JSON.parse(text);
                    allVectors = allVectors.concat(vectors);
                } catch (e) {
                    console.warn(`Could not load vectors for file ${fileId}`);
                }
            }
        } else {
            // Search all files in vectorDir
            for await (const entry of vectorDir.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                    const file = await entry.getFile();
                    const text = await file.text();
                    const vectors = JSON.parse(text);
                    allVectors = allVectors.concat(vectors);
                }
            }
        }

        const scored = allVectors.map(v => ({
            ...v,
            score: cosineSimilarity(queryEmbedding, v.embedding)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    },

    async delete(fileId) {
        try {
            const root = await navigator.storage.getDirectory();
            const vectorDir = await root.getDirectoryHandle("vectors", { create: true });
            await vectorDir.removeEntry(`${fileId}.json`);
            console.log(`Vector data for file ${fileId} deleted from OPFS.`);
        } catch (e) {
            console.warn(`Could not delete vector data for file ${fileId}:`, e.message);
        }
    }
};
