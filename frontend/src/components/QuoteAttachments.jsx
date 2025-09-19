import React, { useState, useEffect } from 'react';
import api from '../services/api';

const QuoteAttachments = ({ quotes }) => {
  const [attachments, setAttachments] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const [previewModal, setPreviewModal] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (quotes && quotes.length > 0) {
      quotes.forEach(quote => {
        const quoteId = quote._id || quote.id;
        if (quoteId && !attachments[quoteId]) {
          loadAttachments(quoteId);
        }
      });
    }
  }, [quotes]);

  const loadAttachments = async (quoteId) => {
    setLoading(prev => ({ ...prev, [quoteId]: true }));
    setError(prev => ({ ...prev, [quoteId]: null }));

    try {
      const response = await api.get(`/quotes/${quoteId}/attachments`);
      setAttachments(prev => ({ ...prev, [quoteId]: response.data.attachments || [] }));
    } catch (err) {
      console.error('Failed to load attachments:', err);
      setError(prev => ({ 
        ...prev, 
        [quoteId]: err.response?.data?.message || 'Failed to load attachments' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [quoteId]: false }));
    }
  };

  const downloadAttachment = async (quoteId, attachmentId, filename) => {
    try {
      const response = await api.get(
        `/quotes/${quoteId}/attachments/${attachmentId}/download`,
        {
          responseType: 'blob'
        }
      );

      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  const previewAttachment = async (quoteId, attachmentId, filename, contentType) => {
    setPreviewLoading(true);
    try {
      const response = await api.get(
        `/quotes/${quoteId}/attachments/${attachmentId}/download`,
        {
          responseType: 'blob'
        }
      );

      const url = URL.createObjectURL(response.data);
      setPreviewModal({
        url,
        filename,
        contentType,
        quoteId,
        attachmentId
      });
    } catch (err) {
      console.error('Preview failed:', err);
      alert('Failed to preview file. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewModal?.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal(null);
  };

  const isPreviewable = (contentType) => {
    return contentType.includes('image') || 
           contentType.includes('pdf') || 
           contentType.includes('text') ||
           contentType.includes('json') ||
           contentType.includes('xml') ||
           contentType.includes('csv');
  };

  const getFileIcon = (contentType) => {
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('image')) return '🖼️';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
    if (contentType.includes('word') || contentType.includes('document')) return '📝';
    if (contentType.includes('zip') || contentType.includes('compressed')) return '📦';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderPreviewContent = () => {
    if (!previewModal) return null;

    const { url, filename, contentType } = previewModal;

    if (contentType.includes('image')) {
      return (
        <img 
          src={url} 
          alt={filename}
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: '80vh' }}
        />
      );
    }

    if (contentType.includes('pdf')) {
      return (
        <iframe
          src={url}
          title={filename}
          className="w-full h-full"
          style={{ height: '80vh' }}
        />
      );
    }

    if (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml') || contentType.includes('csv')) {
      return (
        <div className="w-full h-full bg-gray-50 p-4 overflow-auto" style={{ height: '80vh' }}>
          <iframe
            src={url}
            title={filename}
            className="w-full h-full border-0"
          />
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-gray-600 mb-4">Preview not available for this file type</p>
        <p className="text-sm text-gray-500">You can download the file to view it</p>
      </div>
    );
  };

  if (!quotes || quotes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No quotes available to show attachments.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {quotes.map(quote => {
          const quoteId = quote._id || quote.id;
          const quoteAttachments = attachments[quoteId] || [];
          const isLoading = loading[quoteId];
          const hasError = error[quoteId];

          return (
            <div key={quoteId} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  {quote.supplierName || 'Unknown Supplier'}
                </h4>
                <span className="text-sm text-gray-500">
                  {quoteAttachments.length} file{quoteAttachments.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading attachments...</span>
                </div>
              )}

              {hasError && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-600">{hasError}</p>
                  <button 
                    onClick={() => loadAttachments(quoteId)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isLoading && !hasError && quoteAttachments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-2xl mb-2">📎</div>
                  <p className="text-sm">No files attached to this quote</p>
                </div>
              )}

              {!isLoading && !hasError && quoteAttachments.length > 0 && (
                <div className="grid gap-3">
                  {quoteAttachments.map(attachment => (
                    <div 
                      key={attachment._id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-xl">{getFileIcon(attachment.contentType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.filename}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{formatFileSize(attachment.size)}</span>
                            <span>{attachment.contentType}</span>
                            {attachment.uploadedAt && (
                              <span>
                                {new Date(attachment.uploadedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        {isPreviewable(attachment.contentType) && (
                          <button
                            onClick={() => previewAttachment(quoteId, attachment._id, attachment.filename, attachment.contentType)}
                            disabled={previewLoading}
                            className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => downloadAttachment(quoteId, attachment._id, attachment.filename)}
                          className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {previewModal.filename}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadAttachment(previewModal.quoteId, previewModal.attachmentId, previewModal.filename)}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={closePreview}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              {renderPreviewContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuoteAttachments;
