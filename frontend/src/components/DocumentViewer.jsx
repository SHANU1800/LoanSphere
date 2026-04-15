import { useState } from 'react';
import * as Icons from './Icons';

export default function DocumentViewer({ url, filename, onClose }) {
    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);

    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename || url || '');
    const isPdf   = /\.pdf$/i.test(filename || url || '');

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
            <div
                className="doc-viewer-modal"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="doc-viewer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icons.FileText />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {filename || 'Document'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setZoom(z => Math.max(50, z - 25))} title="Zoom Out">
                            <Icons.ZoomOut />
                        </button>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: 42, textAlign: 'center' }}>{zoom}%</span>
                        <button className="btn btn-outline btn-sm" onClick={() => setZoom(z => Math.min(200, z + 25))} title="Zoom In">
                            <Icons.ZoomIn />
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate">
                            <Icons.RotateCw />
                        </button>
                        <a href={url} download={filename} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" title="Download">
                            <Icons.Download />
                        </a>
                        <a href={url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" title="Open in new tab">
                            <Icons.ExternalLink />
                        </a>
                        <button className="btn btn-outline btn-sm" onClick={onClose} title="Close">
                            <Icons.X />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="doc-viewer-body">
                    {isPdf ? (
                        <iframe
                            src={url}
                            title={filename}
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
                        />
                    ) : isImage ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'auto' }}>
                            <img
                                src={url}
                                alt={filename}
                                style={{ maxWidth: '100%', transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: 'center', transition: 'transform 0.2s ease', borderRadius: 8 }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'var(--text-muted)' }}>
                            <Icons.FileText />
                            <p style={{ fontSize: '0.88rem' }}>Preview not available for this file type.</p>
                            <a href={url} download={filename} className="btn btn-primary">
                                <Icons.Download /> Download File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
