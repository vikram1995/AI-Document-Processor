'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { UploadedFile } from '@/types/document';

interface FileUploadProps {
    onFilesUploaded: (files: UploadedFile[]) => void;
    maxFiles?: number;
    maxFileSize?: number;
    accept?: string;
    disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
    onFilesUploaded,
    maxFiles = 10,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    accept = '.pdf,.docx,.doc,.txt',
    disabled = false
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    const validateFile = (file: File): string | null => {
        // Check file size
        if (file.size > maxFileSize) {
            return `File "${file.name}" is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB.`;
        }

        // Check file type
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            return `File "${file.name}" is not a supported format. Please use PDF, Word, or Text files.`;
        }

        return null;
    };

    const uploadFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError('');

        // Validate all files first
        for (const file of files) {
            const validation = validateFile(file);
            if (validation) {
                setError(validation);
                setIsUploading(false);
                return;
            }
        }

        if (files.length > maxFiles) {
            setError(`Too many files selected. Maximum is ${maxFiles} files.`);
            setIsUploading(false);
            return;
        }

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            // Simulate upload progress
            files.forEach(file => {
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
            });

            // Start progress simulation
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    const updated = { ...prev };
                    files.forEach(file => {
                        if (updated[file.name] < 90) {
                            updated[file.name] = Math.min(90, updated[file.name] + Math.random() * 30);
                        }
                    });
                    return updated;
                });
            }, 100);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();

            // Complete progress
            files.forEach(file => {
                setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            });

            // Clear progress after a delay
            setTimeout(() => {
                setUploadProgress({});
            }, 2000);

            if (result.success) {
                const successfulFiles = result.files
                    .filter((file: any) => file.success)
                    .map((file: any) => ({
                        id: file.id,
                        name: file.originalName,
                        size: file.size,
                        type: file.type,
                        uploadedAt: new Date(file.uploadedAt),
                        status: 'uploaded' as const,
                        filePath: file.filePath
                    }));

                onFilesUploaded(successfulFiles);

                // Show any failed uploads
                const failedFiles = result.files.filter((file: any) => !file.success);
                if (failedFiles.length > 0) {
                    setError(`Some files failed to upload: ${failedFiles.map((f: any) => f.error).join(', ')}`);
                }
            }

        } catch (error) {
            console.error('Upload error:', error);
            setError('Failed to upload files. Please try again.');
            setUploadProgress({});
        } finally {
            setIsUploading(false);
        }
    }, [maxFiles, maxFileSize, onFilesUploaded]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragOver(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        uploadFiles(files);
    }, [disabled, uploadFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            uploadFiles(files);
        }
    }, [uploadFiles]);

    const handleBrowseClick = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="w-full">
            {/* Main Drop Zone */}
            <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${isDragOver
                    ? 'border-blue-400 bg-blue-950/50'
                    : disabled
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-600 bg-gray-800 hover:border-blue-500 hover:bg-gray-750'
                    }`}
                onClick={handleBrowseClick}
            >
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={accept}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled}
                />

                {/* Upload Icon */}
                <div className={`mx-auto mb-4 flex justify-center${isDragOver ? 'animate-bounce' : ''}`}>
                    <CloudArrowUpIcon
                        className={`w-12 h-12 ${disabled ? 'text-gray-300' : isDragOver ? 'text-blue-500' : 'text-gray-400'
                            }`}
                    />
                </div>

                {/* Upload Text */}
                <div className="space-y-2">
                    <p className={`text-lg font-semibold ${disabled ? 'text-gray-400 dark:text-gray-500' : isDragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                        }`}>
                        {isDragOver ? 'Drop files here!' : 'Drag & drop your documents'}
                    </p>
                    <p className={`text-sm ${disabled ? 'text-gray-300 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        or <span className="text-blue-600 dark:text-blue-400 font-medium">browse files</span> to upload
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Supports PDF, Word documents, and text files • Max {formatFileSize(maxFileSize)} per file
                    </p>
                </div>

                {/* Loading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-xl">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-blue-600 font-medium">Uploading files...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Upload Progress:</h4>
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                        <div key={fileName} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{fileName}</span>
                                <span className="text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Upload Error</p>
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* File Requirements */}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                <p className="mb-1">📋 <strong>Supported formats:</strong> PDF, Word Documents (.docx, .doc), Text Files (.txt)</p>
                <p className="mb-1">📏 <strong>File size limit:</strong> {formatFileSize(maxFileSize)} per file</p>
                <p>📚 <strong>Maximum files:</strong> {maxFiles} files at once</p>
            </div>
        </div>
    );
};

export default FileUpload;
