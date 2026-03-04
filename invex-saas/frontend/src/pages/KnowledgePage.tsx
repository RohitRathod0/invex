import React, { useRef, useState, useEffect } from 'react';
import { Upload, File, Trash2, Download, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '@/api/apiClient';

interface Doc {
    id: string;
    name: string;
    size: number;
    uploaded_at: string;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const KnowledgePage = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [documents, setDocuments] = useState<Doc[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchDocs = async () => {
        try {
            const res = await apiClient.get('/documents/');
            setDocuments(res.data.documents || []);
        } catch {
            // Backend may not have persisted docs across restart — that's OK for MVP
        }
    };

    useEffect(() => { fetchDocs(); }, []);

    const uploadFile = async (file: File) => {
        const allowed = ['.pdf', '.txt', '.md'];
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
            showToast('error', `Unsupported file type. Use PDF, TXT, or MD.`);
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showToast('error', 'File exceeds 50MB limit.');
            return;
        }

        setUploading(true);
        setUploadProgress(`Uploading ${file.name}...`);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await apiClient.post('/documents/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setDocuments(prev => [res.data, ...prev]);
            showToast('success', `${file.name} uploaded successfully.`);
        } catch (e: any) {
            showToast('error', e?.response?.data?.detail || 'Upload failed.');
        } finally {
            setUploading(false);
            setUploadProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    };

    const handleDelete = async (id: string, name: string) => {
        try {
            await apiClient.delete(`/documents/${id}`);
            setDocuments(prev => prev.filter(d => d.id !== id));
            showToast('success', `${name} deleted.`);
        } catch {
            showToast('error', 'Failed to delete document.');
        }
    };

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto bg-gray-50/50 relative">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)}><X size={16} /></button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
                    <p className="text-gray-500 mt-1">Upload documents to give Invex AI additional context.</p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center space-x-2 bg-primary-mid text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60"
                >
                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                    <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                </button>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Drop Zone */}
            <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer group ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${isDragging ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-blue-50 text-blue-500 group-hover:scale-110'}`}>
                    {uploading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                </div>
                <h3 className="text-lg font-medium text-gray-700">
                    {uploading ? uploadProgress : 'Drop files here or click to browse'}
                </h3>
                <p className="text-gray-400 mt-2 text-sm">Supports PDF, TXT, MD — Max 50MB</p>
            </div>

            {/* Document List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 font-medium text-gray-500 text-sm">Name</th>
                            <th className="px-6 py-4 font-medium text-gray-500 text-sm">Size</th>
                            <th className="px-6 py-4 font-medium text-gray-500 text-sm">Uploaded</th>
                            <th className="px-6 py-4 font-medium text-gray-500 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {documents.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    No documents uploaded yet. Upload your first document above.
                                </td>
                            </tr>
                        ) : (
                            documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <File size={20} className="text-blue-400 flex-shrink-0" />
                                            <span className="font-medium text-gray-700 truncate max-w-xs">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{formatSize(doc.size)}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(doc.uploaded_at)}</td>
                                    <td className="px-6 py-4 text-right space-x-1">
                                        <button
                                            onClick={() => handleDelete(doc.id, doc.name)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
