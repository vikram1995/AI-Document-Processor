'use client';

import React, { useState, useEffect } from 'react';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    DocumentIcon
} from '@heroicons/react/24/outline';
import { UploadedFile, DocumentAnalysis, ProcessingProgress } from '@/types/document';

interface ProcessingStatusProps {
    files: UploadedFile[];
    onProcessingComplete: (results: DocumentAnalysis[]) => void;
    onProcessingStart?: () => void;
    onProcessingProgress?: (progress: ProcessingProgress) => void;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
    files,
    onProcessingComplete,
    onProcessingStart,
    onProcessingProgress
}) => {
    const [processingFiles, setProcessingFiles] = useState<{ [key: string]: ProcessingProgress }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [completedResults, setCompletedResults] = useState<DocumentAnalysis[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);
    const [error, setError] = useState<string>('');
    const [processedCount, setProcessedCount] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);

    const totalFiles = files.length;
    const allFilesCompleted = processedCount === totalFiles && totalFiles > 0;

    // Process files when files array changes
    useEffect(() => {
        if (files.length > 0 && !isProcessing) {
            startProcessing();
        }
    }, [files, isProcessing]);

    // Update overall progress
    useEffect(() => {
        if (totalFiles > 0) {
            const avgProgress = Object.values(processingFiles).reduce((sum, file) => sum + file.progress, 0) / totalFiles;
            setOverallProgress(Math.min(100, avgProgress));
        }
    }, [processingFiles, totalFiles]);

    const startProcessing = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setStartTime(new Date());
        setError('');
        setCompletedResults([]);
        setProcessedCount(0);
        onProcessingStart?.();

        // Initialize processing status for each file
        const initialStatus: { [key: string]: ProcessingProgress } = {};
        files.forEach(file => {
            initialStatus[file.id] = {
                fileId: file.id,
                progress: 0,
                status: 'Initializing...',
                message: 'Preparing document for analysis'
            };
        });
        setProcessingFiles(initialStatus);

        try {
            // Process files sequentially for better progress tracking
            const results: DocumentAnalysis[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                try {
                    // Update status to processing
                    setProcessingFiles(prev => ({
                        ...prev,
                        [file.id]: {
                            fileId: file.id,
                            progress: 10,
                            status: 'Processing...',
                            message: 'Analyzing document content'
                        }
                    }));
                    onProcessingProgress?.({
                        fileId: file.id,
                        progress: 10,
                        status: 'Processing...'
                    });

                    // Simulate progressive updates for better UX
                    const progressUpdates = [
                        { progress: 25, message: 'Extracting text content...' },
                        { progress: 50, message: 'Running AI analysis...' },
                        { progress: 75, message: 'Processing insights...' },
                    ];

                    // Apply progressive updates with delays
                    for (const update of progressUpdates) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        setProcessingFiles(prev => ({
                            ...prev,
                            [file.id]: {
                                fileId: file.id,
                                progress: update.progress,
                                status: 'Processing...',
                                message: update.message
                            }
                        }));
                        onProcessingProgress?.({
                            fileId: file.id,
                            progress: update.progress,
                            status: 'Processing...',
                            message: update.message
                        });
                    }

                    // Call the actual processing function
                    const response = await fetch('/api/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: file.id,
                            fileName: file.name,
                            filePath: file.filePath,
                            type: file.type
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Processing failed: ${response.statusText}`);
                    }

                    const result = await response.json();
                    results.push(result);

                    // Update to completed
                    setProcessingFiles(prev => ({
                        ...prev,
                        [file.id]: {
                            fileId: file.id,
                            progress: 100,
                            status: 'Completed',
                            message: 'Analysis complete!'
                        }
                    }));

                    setProcessedCount(prev => prev + 1);

                } catch (fileError) {
                    console.error(`Failed to process ${file.name}:`, fileError);

                    // Update to error state
                    setProcessingFiles(prev => ({
                        ...prev,
                        [file.id]: {
                            fileId: file.id,
                            progress: 0,
                            status: 'Error',
                            message: fileError instanceof Error ? fileError.message : 'Processing failed'
                        }
                    }));

                    // Add error result
                    results.push({
                        id: file.id,
                        fileName: file.name,
                        fileType: file.type,
                        processingTime: 0,
                        textContent: '',
                        wordCount: 0,
                        sentiment: 'Error',
                        topics: [],
                        summary: `Processing failed: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
                        entities: [],
                        keyInsights: [],
                        analyzedAt: new Date(),
                        confidence: 0
                    });

                    setProcessedCount(prev => prev + 1);
                }
            }

            setCompletedResults(results);
            onProcessingComplete(results);

        } catch (error) {
            console.error('Batch processing error:', error);
            setError(error instanceof Error ? error.message : 'Processing failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'text-green-400 bg-green-900/20 border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:border-green-600';
            case 'Processing...':
                return 'text-blue-400 bg-blue-900/20 border-blue-700 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-600';
            case 'Error':
                return 'text-red-400 bg-red-900/20 border-red-700 dark:text-red-300 dark:bg-red-900/30 dark:border-red-600';
            default:
                return 'text-gray-400 bg-gray-900/20 border-gray-700 dark:text-gray-300 dark:bg-gray-900/30 dark:border-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completed':
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'Processing...':
                return <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />;
            case 'Error':
                return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
            default:
                return <ClockIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatTime = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleTimeString();
    };

    const getElapsedTime = () => {
        if (!startTime) return '';
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (files.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <DocumentIcon className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">Upload documents to begin AI analysis</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <ArrowPathIcon className="w-6 h-6 text-blue-500" />
                    Processing Status
                </h2>
                {startTime && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Started: {formatTime(startTime)} • Elapsed: {getElapsedTime()}
                    </div>
                )}
            </div>

            {/* Overall Progress */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">Overall Progress</span>
                    <span>{processedCount}/{totalFiles} files • {Math.round(overallProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                {allFilesCompleted && (
                    <div className="flex items-center justify-center mt-3 text-green-600 dark:text-green-400 font-medium">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        All documents processed successfully!
                    </div>
                )}
            </div>

            {/* Individual File Progress */}
            <div className="space-y-4">
                {files.map(file => {
                    const progress = processingFiles[file.id];
                    if (!progress) return null;

                    return (
                        <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                            {/* File Info */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <DocumentIcon className="w-8 h-8 text-gray-400" />
                                    <div>
                                        <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">{file.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {(file.size / 1024).toFixed(1)} KB • {file.type?.split('/')[1]?.toUpperCase() || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(progress.status)}`}>
                                    <span className="mr-1">{getStatusIcon(progress.status)}</span>
                                    {progress.status}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${progress.status === 'Error' ? 'bg-red-500' :
                                            progress.status === 'Completed' ? 'bg-green-500' :
                                                'bg-blue-500'
                                            }`}
                                        style={{ width: `${progress.progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Status Message */}
                            <div className="text-sm text-gray-600">
                                {progress.message && (
                                    <p className="flex items-center gap-2">
                                        {progress.status === 'Processing...' && (
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                        {progress.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="font-medium">Processing Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing Summary */}
            {allFilesCompleted && completedResults.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                        <span className="text-xl">✅</span>
                        <p className="font-medium">Processing Complete!</p>
                    </div>
                    <div className="text-sm text-green-600">
                        <p>Successfully processed {completedResults.filter(r => r.confidence > 0).length} documents</p>
                        <p>Total processing time: {getElapsedTime()}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcessingStatus;
