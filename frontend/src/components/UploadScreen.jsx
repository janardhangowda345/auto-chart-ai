import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const UploadScreen = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const droppedFile = acceptedFiles[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploadSuccess(response.data);
    } catch (err) {
      console.error('Upload failed', err);
      setError(err.response?.data?.detail || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden hero-grid">
      {/* Background Decorative Circles */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow"></div>
      
      <div className="z-10 max-w-2xl w-full text-center space-y-8 animate-fade-up">
        <header className="space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-semibold border border-primary/20 tracking-wide uppercase">
            Data Analysis Redefined
          </div>
          <h1 className="text-6xl font-extrabold tracking-tight text-white sm:text-7xl">
            Drop your data. <br />
            <span className="text-primary glow-text">Get instant insights.</span>
          </h1>
          <p className="text-lg text-muted max-w-lg mx-auto">
            AI analyzes your file and picks the best visualizations automatically. No manual configuration needed.
          </p>
        </header>

        <div 
          {...getRootProps()} 
          className={`relative group cursor-pointer transition-all duration-500 rounded-3xl border-2 border-dashed p-12
            ${isDragActive 
              ? 'border-primary bg-primary/5 scale-[1.02] glow' 
              : 'border-white/10 bg-surface/50 hover:border-primary/50 hover:bg-surface/70'
            }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-6">
            <div className={`p-6 rounded-2xl transition-all duration-500 
              ${isDragActive ? 'bg-primary text-white' : 'bg-surface border border-white/10 text-muted group-hover:text-primary group-hover:border-primary/30'}`}>
              <Upload size={48} className={isDragActive ? 'animate-bounce' : ''} />
            </div>
            
            <div className="space-y-2">
              <p className="text-xl font-medium text-white">
                {isDragActive ? 'Release to upload' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-sm text-muted">
                Supports CSV, XLSX, XLS, and JSON (max 50MB)
              </p>
            </div>
          </div>
        </div>

        {file && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-white/10 mb-6 w-full max-w-sm">
              <div className="bg-primary/20 p-2 rounded-lg text-primary">
                <FileText size={24} />
              </div>
              <div className="flex-1 text-left truncate">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={() => setFile(null)} 
                className="text-muted hover:text-white transition-colors"
                disabled={uploading}
              >
                ✕
              </button>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`w-full group relative flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]
                ${uploading ? 'opacity-70 cursor-not-allowed translate-y-0' : ''}`}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Scanning Dataset...</span>
                </>
              ) : (
                <>
                  <span>Analyze with AI</span>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20 animate-fade-in uppercase text-xs font-bold tracking-widest">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex justify-center gap-4 pt-4 grayscale opacity-50">
            {['CSV', 'JSON', 'XLSX', 'XLS'].map(ext => (
                <span key={ext} className="px-3 py-1 bg-surface border border-white/10 rounded-md text-[10px] font-bold tracking-tighter">{ext}</span>
            ))}
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;
