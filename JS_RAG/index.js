import express from "express";
import multer from "multer";
import fs from "fs";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings, Ollama } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Setup Express
const app = express();
const PORT = 3002;
app.use(express.json());

// Multer setup (for file uploads)
const upload = multer({ dest: "uploads/" });

// 🔹 Ollama Embedding + LLM config
const OLLAMA_BASE = "http://localhost:11434";
const CHROMA_URL = "http://localhost:8000";
const COLLECTION_NAME = "resume_collection";

// ============================
// 📁 1️⃣ Upload + Process PDF
// ============================
app.post("/upload", upload.single("pdfFile"), async (req, res) => {
  try {
    const pdfPath = req.file.path;

    console.log(`📄 Loading PDF from: ${pdfPath}`);
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);

    console.log(`✅ Split into ${splitDocs.length} chunks`);

    // Clean metadata for Chroma
    const cleanedDocs = splitDocs.map((doc, i) => ({
      ...doc,
      id: `doc-${i}`,
      metadata: Object.fromEntries(
        Object.entries(doc.metadata || {}).map(([k, v]) => [
          k,
          typeof v === "object" ? JSON.stringify(v) : v,
        ])
      ),
    }));

    // Create embeddings using Ollama
    const embeddings = new OllamaEmbeddings({
      model: "embeddinggemma",
      baseUrl: OLLAMA_BASE,
    });

    // Store embeddings in ChromaDB
    await Chroma.fromDocuments(cleanedDocs, embeddings, {
      collectionName: COLLECTION_NAME,
      url: CHROMA_URL,
    });

    fs.unlinkSync(pdfPath); // delete uploaded file after processing
    res.json({ message: "✅ PDF processed and stored in ChromaDB!" });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// 💬 2️⃣ Query Endpoint
// ============================
app.post("/query", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required!" });
    }

    console.log(`🔍 Querying: ${question}`);

    // Reconnect to Chroma
    const embeddings = new OllamaEmbeddings({
      model: "embeddinggemma",
      baseUrl: OLLAMA_BASE,
    });
    const vectorStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: COLLECTION_NAME,
      url: CHROMA_URL,
    });

    // Retrieve relevant context
    const retrievedDocs = await vectorStore.similaritySearch(question, 3);
    const context = retrievedDocs.map((doc) => doc.pageContent).join("\n\n");

    // Generate answer with Ollama
    const llm = new Ollama({
      model: "gemma:2b",
      baseUrl: OLLAMA_BASE,
    });

    const prompt = ChatPromptTemplate.fromTemplate(`
      You are a helpful assistant answering questions based on a resume.
      Context:
      {context}
      Question:
      {question}
      Answer in points paragraph.
    `);

    const chain = prompt.pipe(llm);
    const response = await chain.invoke({ context, question });

    res.json({
      answer: response,
      sources: retrievedDocs.map((d) => d.metadata),
    });
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// 🚀 Start Server
// ============================
app.listen(PORT, () =>
  console.log(`🚀 Express + LangChain API running at http://localhost:${PORT}`)
);
