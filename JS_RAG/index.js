import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings, Ollama } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import cors from "cors";

const app = express();
const PORT = 3002;
app.use(express.json());
app.use(cors());

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); 
    const base = path.basename(file.originalname, ext);
    cb(null, `${Date.now()}-${base}${ext}`); 
  },
});

const upload = multer({ storage });


const OLLAMA_BASE = "http://localhost:11434";
const CHROMA_URL = "http://localhost:8000";
const COLLECTION_NAME = "resume_collection";
app.post("/upload", upload.single("pdfFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded!" });
    }
console.log(req?.file)

    const pdfPath = req.file.path || `${req.file.destination}${req.file.filename}`;
    console.log(`📄 Loading PDF from: ${pdfPath}`);


    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();


    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`✅ Split into ${splitDocs.length} chunks`);

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

    const embeddings = new OllamaEmbeddings({
      model: "embeddinggemma",
      baseUrl: OLLAMA_BASE,
    });

    await Chroma.fromDocuments(cleanedDocs, embeddings, {
      collectionName: COLLECTION_NAME,
      url: CHROMA_URL,
    });

    fs.unlinkSync(pdfPath);
    res.json({ message: "✅ PDF processed and stored in ChromaDB!" });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});



app.post("/query", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required!" });
    }

    console.log(`🔍 Querying: ${question}`);

    const embeddings = new OllamaEmbeddings({
      model: "embeddinggemma",
      baseUrl: OLLAMA_BASE,
    });
    const vectorStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: COLLECTION_NAME,
      url: CHROMA_URL,
    });

    const retrievedDocs = await vectorStore.similaritySearch(question, 3);
    const context = retrievedDocs.map((doc) => doc.pageContent).join("\n\n");

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


app.listen(PORT, () =>
  console.log(`🚀 Express + LangChain API running at http://localhost:${PORT}`)
);
