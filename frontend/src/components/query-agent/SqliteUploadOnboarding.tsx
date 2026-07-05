import React, { useRef } from 'react';
import { Upload, Database, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { type ActiveSqliteWorkspaceResponse } from '../../services/api';

export type QueryAgentStep =
  | 'NEED_SQLITE_UPLOAD'
  | 'SQLITE_UPLOADING'
  | 'SQLITE_UPLOADED'
  | 'SCHEMA_INDEXING'
  | 'SCHEMA_INDEXED'
  | 'READY_TO_ASK'
  | 'ERROR';

interface OnboardingProps {
  step: QueryAgentStep;
  workspace: ActiveSqliteWorkspaceResponse | null;
  onFileSelected: (file: File) => void;
  onIngestSchema: () => void;
  ingestAnimStep: number;
  error: string;
}

export const SqliteUploadOnboarding: React.FC<OnboardingProps> = ({
  step,
  workspace,
  onFileSelected,
  onIngestSchema,
  ingestAnimStep,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Steps indicator configuration
  const steps = [
    { label: 'Upload', active: step !== 'NEED_SQLITE_UPLOAD', done: !['NEED_SQLITE_UPLOAD', 'SQLITE_UPLOADING'].includes(step) },
    { label: 'Validate', active: !['NEED_SQLITE_UPLOAD', 'SQLITE_UPLOADING'].includes(step), done: !['NEED_SQLITE_UPLOAD', 'SQLITE_UPLOADING', 'SQLITE_UPLOADED'].includes(step) },
    { label: 'Index', active: ['SCHEMA_INDEXING', 'SCHEMA_INDEXED', 'READY_TO_ASK'].includes(step), done: ['SCHEMA_INDEXED', 'READY_TO_ASK'].includes(step) },
    { label: 'Ask', active: step === 'READY_TO_ASK', done: false },
  ];

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Visual step boxes connected by lines */}
      <div className="flex items-center justify-between w-full max-w-lg mx-auto bg-[#0E1116] border border-[#252B36] rounded p-4 font-mono-code">
        {steps.map((s, idx) => (
          <React.Fragment key={idx}>
            <div className="flex items-center gap-2">
              <div 
                className={`w-6 h-6 border flex items-center justify-center text-[11px] font-bold rounded ${
                  s.done 
                    ? 'border-[#3ECF8E] text-[#3ECF8E] bg-[#3ECF8E]/10' 
                    : s.active 
                    ? 'border-[#53D6CC] text-[#53D6CC] bg-[#53D6CC]/10' 
                    : 'border-[#252B36] text-[#7E8A99]'
                }`}
              >
                {idx + 1}
              </div>
              <span className={`text-xs font-semibold ${s.active ? 'text-[#E6E8EF]' : 'text-[#7E8A99]'}`}>
                {s.label}
              </span>
            </div>
            {idx < 3 && <div className="h-[1px] flex-1 bg-[#252B36] mx-2" />}
          </React.Fragment>
        ))}
      </div>

      {/* Main Terminal Chat Card */}
      <div className="terminal-card shadow-lg flex flex-col">
        <div className="terminal-header justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF5F5F]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5C26B]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
            <span className="text-slate-500 font-bold ml-2">querygen_agent</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">SQLite Mode</span>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-4 font-mono-code text-xs leading-relaxed bg-[#10141B] max-h-[360px] overflow-y-auto">
          {/* Bot Greeting */}
          <div className="flex gap-2">
            <span className="text-[#53D6CC] font-bold shrink-0">Bot:</span>
            <div className="text-[#B8C0CC]">
              Welcome to QueryGen AI. Please upload your SQLite database file to start.
            </div>
          </div>

          {/* User & Validation logs */}
          {workspace && (
            <>
              <div className="flex gap-2 justify-end">
                <div className="text-[#53D6CC] bg-[#53D6CC]/5 px-3 py-1.5 rounded border border-[#53D6CC]/20 max-w-[80%]">
                  Uploaded: {workspace.original_filename}
                </div>
                <span className="text-[#53D6CC] font-bold shrink-0">You</span>
              </div>

              <div className="flex gap-2">
                <span className="text-[#53D6CC] font-bold shrink-0">Bot:</span>
                <div className="text-[#B8C0CC]">
                  Validating SQLite database file...
                </div>
              </div>

              <div className="flex gap-2">
                <span className="text-[#53D6CC] font-bold shrink-0">Bot:</span>
                <div className="text-[#E6E8EF] flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-[#3ECF8E]" />
                  SQLite database file validated. Found {workspace.table_count} tables.
                </div>
              </div>
            </>
          )}

          {/* Schema Indexing Logs */}
          {step === 'SCHEMA_INDEXING' && (
            <div className="flex gap-2">
              <span className="text-[#53D6CC] font-bold shrink-0">Bot:</span>
              <div className="text-[#7E8A99] space-y-1">
                <div>Introspecting schema tables & columns...</div>
                {ingestAnimStep >= 2 && <div className="text-slate-400">Filtering platform internal tables...</div>}
                {ingestAnimStep >= 3 && <div className="text-[#8B7CF6]">Generating embeddings via fastembed (bge-small-en-v1.5)...</div>}
                {ingestAnimStep >= 4 && <div className="text-[#53D6CC]">Uploading schema points to Qdrant Cloud...</div>}
              </div>
            </div>
          )}

          {workspace?.schema_indexed && (
            <div className="flex gap-2">
              <span className="text-[#53D6CC] font-bold shrink-0">Bot:</span>
              <div className="text-[#3ECF8E] flex items-center gap-1.5">
                <CheckCircle size={12} className="text-[#3ECF8E]" />
                Schema indexed successfully. Qdrant is ready. You can now ask questions.
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-2">
              <span className="text-[#EF5F5F] font-bold shrink-0">Error:</span>
              <div className="text-[#EF5F5F] bg-[#EF5F5F]/5 px-3 py-2 rounded border border-[#EF5F5F]/20 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Dropzone & Control panel in card footer */}
        <div className="border-t border-[#252B36] p-6 bg-[#151922] flex flex-col gap-4">
          {step === 'NEED_SQLITE_UPLOAD' || step === 'SQLITE_UPLOADING' ? (
            <div 
              className="sqlite-dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".db,.sqlite,.sqlite3"
                className="hidden" 
              />
              <Upload size={24} className="text-[#53D6CC] mx-auto mb-2.5" />
              <h4 className="text-sm font-bold text-[#E6E8EF]">Upload SQLite Database</h4>
              <p className="text-[11px] text-[#7E8A99] mt-1 leading-normal">
                Drag and drop your `.db`, `.sqlite`, or `.sqlite3` file here, or click to browse.
              </p>
            </div>
          ) : step === 'SQLITE_UPLOADED' || step === 'SCHEMA_INDEXING' ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Database size={28} className="text-[#53D6CC]" />
                <div className="text-left">
                  <h4 className="text-xs font-bold text-[#E6E8EF]">{workspace?.original_filename}</h4>
                  <p className="text-[10px] text-[#7E8A99] font-mono mt-0.5">
                    {workspace?.table_count} tables · SQLite Workspace
                  </p>
                </div>
              </div>
              <button 
                onClick={onIngestSchema}
                disabled={step === 'SCHEMA_INDEXING'}
                className="btn-primary flex items-center gap-2"
              >
                {step === 'SCHEMA_INDEXING' ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <span>Sync Schema to Qdrant</span>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
