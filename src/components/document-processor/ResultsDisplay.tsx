'use client';

import React, { useState, useMemo } from 'react';
import {
    DocumentIcon,
    ChartBarIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
    TableCellsIcon,
    ViewColumnsIcon,
    ListBulletIcon
} from '@heroicons/react/24/outline';
import { DocumentAnalysis } from '@/types/document';

interface ResultsDisplayProps {
    results: DocumentAnalysis[];
    onClearResults?: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
    results,
    onClearResults
}) => {
    const [selectedResult, setSelectedResult] = useState<DocumentAnalysis | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'name' | 'confidence' | 'wordCount' | 'date'>('date');
    const [filterSentiment, setFilterSentiment] = useState<string>('all');

    // Calculate summary statistics
    const statistics = useMemo(() => {
        if (results.length === 0) return null;

        const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
        const sentimentCounts = results.reduce((acc, r) => {
            acc[r.sentiment] = (acc[r.sentiment] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

        return {
            totalDocuments: results.length,
            totalWords,
            avgConfidence,
            sentimentCounts,
            avgProcessingTime
        };
    }, [results]);

    // Filter and sort results
    const filteredAndSortedResults = useMemo(() => {
        let filtered = results;

        // Filter by sentiment
        if (filterSentiment !== 'all') {
            filtered = filtered.filter(r => r.sentiment.toLowerCase() === filterSentiment.toLowerCase());
        }

        // Sort results
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.fileName.localeCompare(b.fileName);
                case 'confidence':
                    return b.confidence - a.confidence;
                case 'wordCount':
                    return b.wordCount - a.wordCount;
                case 'date':
                default:
                    return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
            }
        });
    }, [results, filterSentiment, sortBy]);

    // Export functions
    const exportToJSON = () => {
        const dataStr = JSON.stringify(results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `document-analysis-${new Date().toISOString().split('T')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportToCSV = () => {
        const headers = [
            'File Name',
            'File Type',
            'Word Count',
            'Sentiment',
            'Topics',
            'Summary',
            'Entities',
            'Key Insights',
            'Confidence',
            'Processing Time (ms)',
            'Analyzed At'
        ];

        const csvData = results.map(result => [
            result.fileName,
            result.fileType,
            result.wordCount,
            result.sentiment,
            result.topics.join('; '),
            result.summary.replace(/,/g, ';'),
            result.entities.join('; '),
            result.keyInsights.join('; '),
            result.confidence,
            result.processingTime,
            new Date(result.analyzedAt).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `document-analysis-${new Date().toISOString().split('T')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment.toLowerCase()) {
            case 'positive':
                return 'text-green-400 bg-green-900/20 border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:border-green-600';
            case 'negative':
                return 'text-red-400 bg-red-900/20 border-red-700 dark:text-red-300 dark:bg-red-900/30 dark:border-red-600';
            case 'neutral':
                return 'text-blue-400 bg-blue-900/20 border-blue-700 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-600';
            case 'mixed':
                return 'text-purple-400 bg-purple-900/20 border-purple-700 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-600';
            default:
                return 'text-gray-400 bg-gray-900/20 border-gray-700 dark:text-gray-300 dark:bg-gray-900/30 dark:border-gray-600';
        }
    };

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment.toLowerCase()) {
            case 'positive':
                return '😊';
            case 'negative':
                return '😞';
            case 'neutral':
                return '😐';
            case 'mixed':
                return '🤔';
            default:
                return <span className="w-4 h-4 text-gray-500">?</span>;
        }
    };

    if (results.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <ChartBarIcon className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No analysis results yet. Upload and process documents to see insights here.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            {/* Header with Statistics */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4" />
                        Analysis Results
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={exportToJSON}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Export JSON
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                        >
                            <TableCellsIcon className="w-4 h-4" />
                            Export CSV
                        </button>
                        {onClearResults && (
                            <button
                                onClick={onClearResults}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                            >
                                <XMarkIcon className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Statistics Grid */}
                {statistics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="text-blue-600 dark:text-blue-300 text-sm font-medium">Total Documents</div>
                            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{statistics.totalDocuments}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="text-green-600 dark:text-green-300 text-sm font-medium">Total Words</div>
                            <div className="text-2xl font-bold text-green-800 dark:text-green-200">{statistics.totalWords.toLocaleString()}</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                            <div className="text-purple-600 dark:text-purple-300 text-sm font-medium">Avg Confidence</div>
                            <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{(statistics.avgConfidence * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                            <div className="text-orange-600 dark:text-orange-300 text-sm font-medium">Avg Processing</div>
                            <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">{(statistics.avgProcessingTime / 1000).toFixed(1)}s</div>
                        </div>
                    </div>
                )}

                {/* Sentiment Distribution */}
                {statistics && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Sentiment Distribution</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(statistics.sentimentCounts).map(([sentiment, count]) => (
                                <div
                                    key={sentiment}
                                    className={`px-3 py-1 flex rounded-full border text-sm font-medium ${getSentimentColor(sentiment)}`}
                                >
                                    <span className="mr-1">{getSentimentIcon(sentiment)}</span>
                                    {sentiment}: {count}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Filters and Controls */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex flex-wrap items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                        >
                            <ViewColumnsIcon className="w-4 h-4" />
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                        >
                            <ListBulletIcon className="w-4 h-4" />
                            List
                        </button>
                    </div>

                    {/* Sort By */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                    >
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                        <option value="confidence">Sort by Confidence</option>
                        <option value="wordCount">Sort by Word Count</option>
                    </select>

                    {/* Filter by Sentiment */}
                    <select
                        value={filterSentiment}
                        onChange={(e) => setFilterSentiment(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                    >
                        <option value="all">All Sentiments</option>
                        <option value="positive">Positive Only</option>
                        <option value="negative">Negative Only</option>
                        <option value="neutral">Neutral Only</option>
                        <option value="mixed">Mixed Only</option>
                    </select>

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {filteredAndSortedResults.length} of {results.length} documents
                    </div>
                </div>
            </div>

            {/* Results Display */}
            <div className="p-6">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredAndSortedResults.map((result) => (
                            <div
                                key={result.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800"
                                onClick={() => setSelectedResult(result)}
                            >
                                {/* File Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <DocumentIcon className="w-8 h-8 text-gray-400" />
                                        <div>
                                            <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]" title={result.fileName}>
                                                {result.fileName}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {result.wordCount} words • {(result.confidence * 100).toFixed(0)}% confidence
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 flex rounded-full border text-xs font-medium ${getSentimentColor(result.sentiment)}`}>
                                        <span className="mr-1">{getSentimentIcon(result.sentiment)}</span>
                                        {result.sentiment}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="mb-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                                        {result.summary}
                                    </p>
                                </div>

                                {/* Topics */}
                                {result.topics.length > 0 && (
                                    <div className="mb-3">
                                        <div className="flex flex-wrap gap-1">
                                            {result.topics.slice(0, 3).map((topic, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                            {result.topics.length > 3 && (
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                                                    +{result.topics.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Processing Info */}
                                <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                                    Processed in {(result.processingTime / 1000).toFixed(1)}s • {new Date(result.analyzedAt).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAndSortedResults.map((result) => (
                            <div
                                key={result.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800"
                                onClick={() => setSelectedResult(result)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <DocumentIcon className="w-8 h-8 text-gray-400" />
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-800 dark:text-gray-200">{result.fileName}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{result.summary}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                <span>{result.wordCount} words</span>
                                                <span>{(result.confidence * 100).toFixed(0)}% confidence</span>
                                                <span>{(result.processingTime / 1000).toFixed(1)}s processing</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 flex rounded-full border text-sm font-medium ${getSentimentColor(result.sentiment)}`}>
                                        <span className="mr-1">{getSentimentIcon(result.sentiment)}</span>
                                        {result.sentiment}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detailed View Modal */}
            {selectedResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 truncate max-w-[800px]">{selectedResult.fileName}</h3>
                            <button
                                onClick={() => setSelectedResult(null)}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Detailed analysis content */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Document Info</h4>
                                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        <p><span className="font-medium">File Type:</span> {selectedResult.fileType}</p>
                                        <p><span className="font-medium">Word Count:</span> {selectedResult.wordCount.toLocaleString()}</p>
                                        <p><span className="font-medium">Confidence:</span> {(selectedResult.confidence * 100).toFixed(1)}%</p>
                                        <p><span className="font-medium">Processing Time:</span> {(selectedResult.processingTime / 1000).toFixed(1)}s</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Analysis Results</h4>
                                    <div className={`px-3 py-2 flex items-center rounded-lg border  ${getSentimentColor(selectedResult.sentiment)} mb-3`}>
                                        <span className="mr-2">{getSentimentIcon(selectedResult.sentiment)}</span>
                                        <span className="font-medium">Sentiment: {selectedResult.sentiment}</span>
                                    </div>
                                </div>
                            </div>

                            <div className='text-gray-700 dark:text-gray-300'>
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Summary</h4>
                                <p className=" leading-relaxed">{selectedResult.summary}</p>
                            </div>

                            {selectedResult.topics.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Topics</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedResult.topics.map((topic, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full"
                                            >
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedResult.entities.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Entities</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedResult.entities.map((entity, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full"
                                            >
                                                {entity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedResult.keyInsights.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Key Insights</h4>
                                    <ul className="space-y-2">
                                        {selectedResult.keyInsights.map((insight, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                                                <span className="text-gray-600 dark:text-gray-300">{insight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsDisplay;
