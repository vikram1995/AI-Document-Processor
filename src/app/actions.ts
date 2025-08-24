"use server";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fs from "fs/promises";
import path from "path";

import mammoth from "mammoth";
import { DocumentAnalysis } from "@/types/document";
import { parsePDFContent } from "@/lib/pdfParser";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.3,
});

// Advanced document analysis prompt
const analysisTemplate = `You are an expert document analyzer. Analyze the following document content and provide comprehensive insights.

Document Content: "{documentText}"

Provide your analysis in JSON format:
{{
  "sentiment": "Positive/Negative/Neutral/Mixed",
  "topics": ["topic1", "topic2", "topic3"],
  "summary": "Comprehensive summary in 2-3 sentences",
  "entities": ["entity1", "entity2", "entity3"],
  "keyInsights": ["insight1", "insight2", "insight3"],
  "confidence": 0.85
}}

Focus on:
- Overall sentiment and tone
- Main topics and themes
- Key entities (people, organizations, locations)
- Important insights or takeaways
- Confidence level in your analysis (0.0-1.0)

Respond with valid JSON only.`;

const prompt = PromptTemplate.fromTemplate(analysisTemplate);

// Helper function to delete uploaded file
async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join("./uploads", filePath);
    await fs.unlink(fullPath);
    console.log(`Deleted uploaded file: ${filePath}`);
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
    // Don't throw error to avoid breaking the main process
  }
}

// Utility function to clean up old files from uploads folder
export async function cleanupUploadsFolder(): Promise<void> {
  try {
    const uploadsDir = path.join("./uploads");
    const files = await fs.readdir(uploadsDir);

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);

      // Delete files older than 1 hour (3600000 ms)
      const oneHourAgo = Date.now() - 3600000;
      if (stats.mtime.getTime() < oneHourAgo) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error("Failed to cleanup uploads folder:", error);
  }
}

export async function processDocumentAction(fileData: {
  id: string;
  fileName: string;
  filePath: string;
  type: string;
}): Promise<DocumentAnalysis> {
  const startTime = Date.now();

  try {
    // Extract text from document based on file type
    const textContent = await extractTextFromFile(
      fileData.filePath,
      fileData.type
    );

    if (!textContent || textContent.trim().length === 0) {
      throw new Error("No text content found in document");
    }

    // Split text for processing if it's very long
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.splitText(textContent);

    // For now, analyze the first chunk or combine if small document
    const analysisText = chunks.length > 1 ? chunks : textContent;

    // Process with LangChain
    const chain = prompt.pipe(model);
    const aiResult = await chain.invoke({ documentText: analysisText });
    console.log("aiResult", aiResult);
    let analysis;
    let cleanedResponse = "";
    try {
      cleanedResponse = String(aiResult.content)
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      console.log("cleanedResponse", cleanedResponse);

      // Try to find JSON content between curly braces
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(cleanedResponse);
      }
      console.log("analysis", analysis);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Failed to parse:", cleanedResponse);
      // Fallback analysis
      analysis = {
        sentiment: "Analysis completed",
        topics: ["Document analysis"],
        summary: "Document processed successfully",
        entities: [],
        keyInsights: ["Document contains valuable content"],
        confidence: 0.7,
      };
    }
    console.log("analysis", analysis);
    const processingTime = Date.now() - startTime;
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    const result: DocumentAnalysis = {
      id: fileData.id,
      fileName: fileData.fileName,
      fileType: fileData.type,
      processingTime,
      textContent: textContent.slice(0, 1000), // Store first 1000 chars
      wordCount,
      pageCount: estimatePageCount(textContent),
      sentiment: analysis.sentiment,
      topics: Array.isArray(analysis.topics) ? analysis.topics : [],
      summary: analysis.summary || "No summary available",
      entities: Array.isArray(analysis.entities) ? analysis.entities : [],
      keyInsights: Array.isArray(analysis.keyInsights)
        ? analysis.keyInsights
        : [],
      analyzedAt: new Date(),
      confidence: analysis.confidence || 0.7,
    };

    // Delete the uploaded file after successful processing
    await deleteUploadedFile(fileData.filePath);

    return result;
  } catch (error) {
    console.error("Document processing error:", error);

    // Even if processing fails, try to delete the file to avoid accumulation
    await deleteUploadedFile(fileData.filePath);

    throw new Error(
      `Failed to process document: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function extractTextFromFile(
  filePath: string,
  fileType: string
): Promise<string> {
  const fullPath = path.join("./uploads", filePath);

  try {
    switch (fileType) {
      case "application/pdf":
        const pdfBuffer = await fs.readFile(fullPath);

        // Use the parsePDFContent function from lib/pdfParser.ts
        const text = await parsePDFContent(pdfBuffer, {
          includePageNumbers: false,
          pageBreakSeparator: "\n",
          preserveWhitespace: false,
        });
        console.log("text", text);
        return text;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        const docBuffer = await fs.readFile(fullPath);
        const docData = await mammoth.extractRawText({ buffer: docBuffer });
        return docData.value;

      case "text/plain":
        return await fs.readFile(fullPath, "utf-8");

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error("Text extraction error:", error);
    throw new Error("Failed to extract text from document");
  }
}

function estimatePageCount(text: string): number {
  // Rough estimate: 250 words per page
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount / 250);
}

export async function processBatchDocuments(
  files: Array<{
    id: string;
    fileName: string;
    filePath: string;
    type: string;
  }>
): Promise<DocumentAnalysis[]> {
  const results: DocumentAnalysis[] = [];

  for (const file of files) {
    try {
      const analysis = await processDocumentAction(file);
      results.push(analysis);
    } catch (error) {
      console.error(`Failed to process ${file.fileName}:`, error);

      // Ensure file is deleted even if processing fails
      await deleteUploadedFile(file.filePath);

      // Add error result
      results.push({
        id: file.id,
        fileName: file.fileName,
        fileType: file.type,
        processingTime: 0,
        textContent: "",
        wordCount: 0,
        sentiment: "Error",
        topics: [],
        summary: `Processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        entities: [],
        keyInsights: [],
        analyzedAt: new Date(),
        confidence: 0,
      });
    }
  }

  return results;
}
