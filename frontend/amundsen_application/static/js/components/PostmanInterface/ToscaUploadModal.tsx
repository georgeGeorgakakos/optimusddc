// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from 'config/apiConfig';
import './ToscaUploadModal.scss';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DataStoreOption {
  name: string;
  dstype: string;
  description: string;
  entryCount: number;
}

interface UploadResult {
  success: boolean;
  templateId?: string;
  storeName?: string;
  storeDescription?: string;
  filename?: string;
  filesize?: number;
  nodeCount?: number;
  message?: string;
  error?: string;
  queryableFields?: string[];
}

interface SelectedFile {
  file: File;
  name: string;
  size: number;
  content: string;
  base64: string;
}

export interface ToscaUploadModalProps {
  onClose: () => void;
  onUploadComplete?: (result: UploadResult) => void;
  apiContext?: string;
  nodeId?: number;
}

// ─── Store name → dstype mapping ─────────────────────────────────────────────

const STORE_DSTYPE_MAP: Record<string, string> = {
  DsSWres: 'dsswres',
  DsSWresaloc: 'dsswresaloc',
  KBMetadata: 'kbmetadata',
  KBdata: 'kbdata',
  DsTOSCA_Imported: 'tosca_imported',
  DsTOSCA_ADT: 'tosca_adt',
  DsTOSCA_Capacities: 'tosca_capacities',
  DsTOSCA_DeploymentPlan: 'tosca_deploymentplan',
  DsTOSCA_EventHistory: 'tosca_eventhistory',
  whoiswhoStore: 'whoiswho',
};

const FALLBACK_STORES: DataStoreOption[] = [
  {
    name: 'DsSWres',
    dstype: 'dsswres',
    description: 'Software resources (default)',
    entryCount: 0,
  },
  {
    name: 'DsTOSCA_Imported',
    dstype: 'tosca_imported',
    description: 'TOSCA templates',
    entryCount: 0,
  },
  {
    name: 'KBMetadata',
    dstype: 'kbmetadata',
    description: 'Primary metadata catalog',
    entryCount: 0,
  },
  {
    name: 'KBdata',
    dstype: 'kbdata',
    description: 'Knowledge base data',
    entryCount: 0,
  },
  {
    name: 'DsSWresaloc',
    dstype: 'dsswresaloc',
    description: 'Resource allocation',
    entryCount: 0,
  },
  {
    name: 'DsTOSCA_ADT',
    dstype: 'tosca_adt',
    description: 'TOSCA data types',
    entryCount: 0,
  },
  {
    name: 'DsTOSCA_Capacities',
    dstype: 'tosca_capacities',
    description: 'TOSCA capacities',
    entryCount: 0,
  },
  {
    name: 'DsTOSCA_DeploymentPlan',
    dstype: 'tosca_deploymentplan',
    description: 'Deployment plans',
    entryCount: 0,
  },
  {
    name: 'DsTOSCA_EventHistory',
    dstype: 'tosca_eventhistory',
    description: 'Event history',
    entryCount: 0,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStoreIcon = (dstype: string): string => {
  if (dstype.includes('tosca')) return '📐';
  if (dstype === 'kbmetadata') return '🏷️';
  if (dstype === 'kbdata') return '📊';
  if (dstype === 'whoiswho') return '👤';
  if (dstype === 'dsswresaloc') return '📦';

  return '💾';
};

const getFileExtension = (name: string): string =>
  name.split('.').pop()?.toUpperCase() || 'FILE';

// ─── Component ───────────────────────────────────────────────────────────────

const ToscaUploadModal: React.FC<ToscaUploadModalProps> = ({
  onClose,
  onUploadComplete,
  apiContext = 'swarmkb',
  nodeId = 1,
}) => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [stores, setStores] = useState<DataStoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('dsswres');
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  // ─── Fetch stores ────────────────────────────────────────────────────────

  const fetchStores = useCallback(async () => {
    setIsLoadingStores(true);
    try {
      const url = buildApiUrl(
        'optimusdb',
        `/${apiContext}/agent/inventory`,
        nodeId
      );
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const active = data?.orbitdb_stores?.active_stores || [];

      const opts: DataStoreOption[] = active
        .filter((s: any) => s.type === 'docstore')
        .map((s: any) => ({
          name: s.name,
          dstype: STORE_DSTYPE_MAP[s.name] || s.name.toLowerCase(),
          description: s.description || s.name,
          entryCount: s.entry_count || 0,
        }));

      setStores(opts.length > 0 ? opts : FALLBACK_STORES);

      const def = opts.find((s) => s.dstype === 'dsswres');

      setSelectedStore(
        def ? def.dstype : opts.length > 0 ? opts[0].dstype : 'dsswres'
      );
    } catch {
      setStores(FALLBACK_STORES);
    } finally {
      setIsLoadingStores(false);
    }
  }, [apiContext, nodeId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // ─── File handling ───────────────────────────────────────────────────────

  const processFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Use btoa with proper encoding for non-ASCII
      let base64: string;

      try {
        base64 = btoa(unescape(encodeURIComponent(text)));
      } catch {
        // Fallback: use ArrayBuffer approach
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        let binary = '';

        bytes.forEach((b) => {
          binary += String.fromCharCode(b);
        });
        base64 = btoa(binary);
      }

      setSelectedFile({
        file,
        name: file.name,
        size: file.size,
        content: text,
        base64,
      });
      setUploadResult(null);
      setUploadProgress(0);
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) processFile(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];

    if (file) processFile(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  // ─── Upload ──────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const tick = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 85));
    }, 180);

    try {
      const url = buildApiUrl('optimusdb', `/${apiContext}/upload`, nodeId);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: selectedFile.base64,
          filename: selectedFile.name,
          store_full_structure: true,
          target_store: selectedStore,
        }),
      });

      clearInterval(tick);
      setUploadProgress(100);

      const data = await res.json();

      if (res.ok) {
        const storeInfo = stores.find((s) => s.dstype === selectedStore);
        const result: UploadResult = {
          success: true,
          templateId: data.template_id,
          storeName: storeInfo?.name || selectedStore,
          storeDescription: storeInfo?.description,
          filename: selectedFile.name,
          filesize: selectedFile.size,
          nodeCount: data.node_count,
          message: data.message,
          queryableFields: data.sample_fields,
        };

        setUploadResult(result);
        onUploadComplete?.(result);
      } else {
        setUploadResult({
          success: false,
          error:
            data.error || data.message || `Upload failed (HTTP ${res.status})`,
        });
      }
    } catch (err: any) {
      clearInterval(tick);
      setUploadResult({
        success: false,
        error: err.message || 'Network error — is OptimusDB reachable?',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setPreviewExpanded(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="tosca-modal-overlay" onClick={onClose}>
      <div className="tosca-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon">📐</div>
            <div>
              <h2>Upload TOSCA Template</h2>
              <p>Parse and persist TOSCA files into an OptimusDB data store</p>
            </div>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* ── SUCCESS ──────────────────────────────────────────────── */}
          {uploadResult?.success && (
            <div className="upload-success">
              <div className="success-animation">
                <div className="success-ring" />
                <div className="success-check">✓</div>
              </div>

              <h3 className="success-title">Template Persisted Successfully</h3>

              <div className="success-card">
                <div className="success-detail">
                  <span className="detail-label">File</span>
                  <span className="detail-value mono">
                    {uploadResult.filename}
                  </span>
                </div>
                <div className="success-detail">
                  <span className="detail-label">Template ID</span>
                  <span className="detail-value mono">
                    {uploadResult.templateId}
                  </span>
                </div>
                <div className="success-detail">
                  <span className="detail-label">Data Store</span>
                  <span className="detail-value">
                    <span className="store-badge-success">
                      {getStoreIcon(selectedStore)} {uploadResult.storeName}
                    </span>
                  </span>
                </div>
                {uploadResult.nodeCount !== undefined &&
                  uploadResult.nodeCount > 0 && (
                    <div className="success-detail">
                      <span className="detail-label">Node Templates</span>
                      <span className="detail-value">
                        {uploadResult.nodeCount} nodes parsed
                      </span>
                    </div>
                  )}
                <div className="success-detail">
                  <span className="detail-label">Size</span>
                  <span className="detail-value">
                    {formatFileSize(uploadResult.filesize || 0)}
                  </span>
                </div>
                {uploadResult.queryableFields &&
                  uploadResult.queryableFields.length > 0 && (
                    <div className="success-detail fields-detail">
                      <span className="detail-label">Queryable Fields</span>
                      <div className="fields-chips">
                        {uploadResult.queryableFields
                          .slice(0, 8)
                          .map((f, i) => (
                            <span key={i} className="field-chip">
                              {f}
                            </span>
                          ))}
                        {uploadResult.queryableFields.length > 8 && (
                          <span className="field-chip more">
                            +{uploadResult.queryableFields.length - 8}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              <div className="success-hint">
                💡 Query this document via the <strong>Query Workbench</strong>{' '}
                using <code>dstype: "{selectedStore}"</code> and{' '}
                <code>_id: "{uploadResult.templateId}"</code>
              </div>

              <div className="success-actions">
                <button className="btn-upload-another" onClick={handleReset}>
                  Upload Another
                </button>
                <button className="btn-done" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────────────────── */}
          {uploadResult && !uploadResult.success && (
            <div className="upload-error">
              <div className="error-icon-big">⚠️</div>
              <h3>Upload Failed</h3>
              <p className="error-message">{uploadResult.error}</p>
              <button className="btn-retry" onClick={handleReset}>
                Try Again
              </button>
            </div>
          )}

          {/* ── FORM ─────────────────────────────────────────────────── */}
          {!uploadResult && (
            <>
              {/* Step 1: Target Store */}
              <div className="form-section">
                <div className="section-label">
                  <span className="step-number">1</span>
                  <span>Select Target Data Store</span>
                </div>

                {isLoadingStores ? (
                  <div className="stores-loading">
                    <div className="spinner-sm" />
                    <span>Discovering stores…</span>
                  </div>
                ) : (
                  <div className="store-selector">
                    {stores.map((store) => (
                      <button
                        key={store.dstype}
                        className={`store-option ${
                          selectedStore === store.dstype ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedStore(store.dstype)}
                        type="button"
                      >
                        <span className="store-icon">
                          {getStoreIcon(store.dstype)}
                        </span>
                        <div className="store-info">
                          <span className="store-name">{store.name}</span>
                          <span className="store-desc">
                            {store.description}
                          </span>
                        </div>
                        <span className="store-count">
                          {store.entryCount} docs
                        </span>
                        {selectedStore === store.dstype && (
                          <span className="store-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: File */}
              <div className="form-section">
                <div className="section-label">
                  <span className="step-number">2</span>
                  <span>Select TOSCA File</span>
                </div>

                {!selectedFile ? (
                  <label
                    className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <input
                      type="file"
                      accept=".json,.yaml,.yml,.tosca,.xml"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-zone-content">
                      <div className="upload-icon-wrapper">
                        <span className="upload-arrow">↑</span>
                      </div>
                      <h3>Drop your TOSCA file here</h3>
                      <p>or click to browse</p>
                      <span className="upload-formats">
                        YAML · JSON · TOSCA · XML
                      </span>
                    </div>
                  </label>
                ) : (
                  <div className="file-selected">
                    <div className="file-card">
                      <div className="file-type-badge">
                        {getFileExtension(selectedFile.name)}
                      </div>
                      <div className="file-info">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-meta">
                          {formatFileSize(selectedFile.size)} · Ready to upload
                        </span>
                      </div>
                      <button
                        className="btn-remove-file"
                        onClick={handleReset}
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>

                    <button
                      className="preview-toggle"
                      onClick={() => setPreviewExpanded(!previewExpanded)}
                    >
                      {previewExpanded ? '▾ Hide' : '▸ Show'} file preview
                    </button>

                    {previewExpanded && (
                      <pre className="file-preview">
                        <code>
                          {selectedFile.content.slice(0, 3000)}
                          {selectedFile.content.length > 3000
                            ? '\n…(truncated)'
                            : ''}
                        </code>
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Progress */}
              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {uploadProgress < 85
                      ? 'Uploading and parsing…'
                      : uploadProgress < 100
                      ? 'Persisting to data store…'
                      : 'Complete!'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!uploadResult && (
          <div className="modal-footer">
            <div className="footer-info">
              {selectedStore && (
                <span className="target-hint">
                  Target:{' '}
                  <strong>
                    {stores.find((s) => s.dstype === selectedStore)?.name ||
                      selectedStore}
                  </strong>
                </span>
              )}
            </div>
            <div className="footer-actions">
              <button className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-upload"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || isLoadingStores}
              >
                {isUploading ? (
                  <>
                    <div className="spinner-sm white" /> Uploading…
                  </>
                ) : (
                  <>
                    <span className="btn-icon">↑</span> Upload to Store
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ToscaUploadModal;
