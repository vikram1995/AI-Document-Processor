export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  status: "uploaded" | "processing" | "completed" | "error";
  filePath?: string;
}

export interface DocumentAnalysis {
  id: string;
  fileName: string;
  fileType: string;
  processingTime: number;
  textContent: string;
  wordCount: number;
  pageCount?: number;

  // AI Analysis Results
  sentiment: string;
  topics: string[];
  summary: string;
  entities: string[];
  keyInsights: string[];

  // Metadata
  analyzedAt: Date;
  confidence: number;
}

export interface ProcessingProgress {
  fileId: string;
  progress: number;
  status: string;
  message?: string;
}

export interface BatchProcessingResult {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  results: DocumentAnalysis[];
  processingTime: number;
}
