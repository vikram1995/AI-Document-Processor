'use client';

import { useState } from 'react';
import {
  CloudArrowUpIcon,
  BoltIcon,
  ChartBarIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import FileUpload from '@/components/document-processor/FileUpload';
import ProcessingStatus from '@/components/document-processor/ProcessingStatus';
import ResultsDisplay from '@/components/document-processor/ResultsDisplay';
import { UploadedFile, DocumentAnalysis } from '@/types/document';

export default function DocumentProcessorPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processingResults, setProcessingResults] = useState<DocumentAnalysis[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'results'>('upload');

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    setCurrentStep('processing');
  };

  const handleProcessingComplete = (results: DocumentAnalysis[]) => {
    setProcessingResults(results);
    setCurrentStep('results');
  };

  const handleStartOver = () => {
    setUploadedFiles([]);
    setProcessingResults([]);
    setCurrentStep('upload');
  };

  const handleClearResults = () => {
    setProcessingResults([]);
    setCurrentStep('upload');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">AI Document Processor</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4 bg-gray-800 rounded-lg p-4">
            {[
              { step: 'upload', icon: CloudArrowUpIcon, label: 'Upload' },
              { step: 'processing', icon: BoltIcon, label: 'Process' },
              { step: 'results', icon: ChartBarIcon, label: 'Results' }
            ].map((step, index) => (
              <div key={step.step} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentStep === step.step
                    ? 'bg-blue-600 text-white'
                    : (currentStep === 'processing' && step.step === 'upload') ||
                      (currentStep === 'results' && (step.step === 'upload' || step.step === 'processing'))
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                    }`}
                >
                  <step.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{step.label}</span>
                </div>
                {index < 2 && (
                  <div className={`w-8 h-px mx-2 ${(currentStep === 'processing' && index === 0) ||
                    (currentStep === 'results' && index <= 1)
                    ? 'bg-green-500'
                    : 'bg-gray-600'
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">

            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Upload Your Documents</h2>
                  <p className="text-gray-400">
                    Drag & drop files or click to browse. Supports PDF, Word, and text files.
                  </p>
                </div>

                <FileUpload onFilesUploaded={handleFilesUploaded} />

                {/* Simple Feature List */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gray-750 rounded-lg border border-gray-600">
                    <CpuChipIcon className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                    <h3 className="font-semibold text-white mb-2">AI Analysis</h3>
                    <p className="text-gray-400 text-sm">Advanced sentiment analysis and topic extraction</p>
                  </div>
                  <div className="text-center p-6 bg-gray-750 rounded-lg border border-gray-600">
                    <RocketLaunchIcon className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <h3 className="font-semibold text-white mb-2">Fast Processing</h3>
                    <p className="text-gray-400 text-sm">Real-time processing with progress tracking</p>
                  </div>
                  <div className="text-center p-6 bg-gray-750 rounded-lg border border-gray-600">
                    <DocumentChartBarIcon className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                    <h3 className="font-semibold text-white mb-2">Export Results</h3>
                    <p className="text-gray-400 text-sm">Download analysis as JSON or CSV files</p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Step */}
            {currentStep === 'processing' && (
              <div className="p-8">
                <ProcessingStatus files={uploadedFiles} onProcessingComplete={handleProcessingComplete} />

                <div className="mt-6 text-center">
                  <button
                    onClick={handleStartOver}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ← Start Over
                  </button>
                </div>
              </div>
            )}

            {/* Results Step */}
            {currentStep === 'results' && (
              <div className="p-8">
                <ResultsDisplay results={processingResults} onClearResults={handleClearResults} />

                <div className="mt-8 text-center">
                  <button
                    onClick={handleStartOver}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Process More Documents
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simple Tech Stack */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-4">Powered by</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {['Next.js 15', 'LangChain', 'Google Gemini', 'TypeScript'].map((tech) => (
              <span key={tech} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full border border-gray-700">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
