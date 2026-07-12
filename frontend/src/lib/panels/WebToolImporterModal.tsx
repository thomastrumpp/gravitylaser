import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface WebToolImporterModalProps {
  onClose: () => void;
}

export const WebToolImporterModal: React.FC<WebToolImporterModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [svgCode, setSvgCode] = useState('');
  const [tab, setTab] = useState<'url' | 'paste'>('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setError('');
    const fabricCanvas = (window as any).fabricCanvas;
    const fabric = (window as any).fabric;
    
    if (!fabricCanvas || !fabric) {
      setError(t("modal_webtool.error_canvas_not_loaded"));
      return;
    }

    let sourceSvg = '';

    if (tab === 'url') {
      if (!url.trim()) {
        setError(t("modal_webtool.error_invalid_url"));
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`${t("modal_webtool.error_http")}: ${response.status}`);
        }
        sourceSvg = await response.text();
      } catch (err: any) {
        setError(`${t("modal_webtool.error_load")}: ${err.message}`);
        setLoading(false);
        return;
      }
      setLoading(false);
    } else {
      if (!svgCode.trim()) {
        setError(t("modal_webtool.error_invalid_code"));
        return;
      }
      sourceSvg = svgCode;
    }

    try {
      fabric.loadSVGFromString(sourceSvg, (objects: any[], options: any) => {
        if (!objects || objects.length === 0) {
          setError(t("modal_webtool.error_no_svg"));
          return;
        }

        const obj = fabric.util.groupSVGElements(objects, options);
        
        const gravityId = Math.random().toString(36).substring(2, 9);
        obj.set({
          id: gravityId,
          data: {
            gravityId,
            name: `${t("modal_webtool.imported_svg")} (${tab === 'url' ? 'URL' : 'Code'})`
          },
          left: 10,
          top: 10
        });

        if (obj.width > fabricCanvas.width || obj.height > fabricCanvas.height) {
          const scale = Math.min(
            (fabricCanvas.width * 0.5) / obj.width,
            (fabricCanvas.height * 0.5) / obj.height
          );
          obj.scale(scale);
        }

        fabricCanvas.add(obj);
        fabricCanvas.setActiveObject(obj);
        fabricCanvas.requestRenderAll();
        
        window.dispatchEvent(new CustomEvent('canvasAction', { detail: { action: 'save-history' } }));
        
        alert(t("modal_webtool.success"));
        onClose();
      });
    } catch (err: any) {
      setError(`${t("modal_webtool.error_import")}: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_webtool.title')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
            {t('modal_webtool.description')}
          </p>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={() => { setTab('url'); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: tab === 'url' ? 'var(--bg-active)' : 'transparent',
                color: tab === 'url' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                borderBottom: tab === 'url' ? '2px solid var(--cyan)' : 'none'
              }}
            >
              {t('modal_webtool.tab_url')}
            </button>
            <button
              onClick={() => { setTab('paste'); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: tab === 'paste' ? 'var(--bg-active)' : 'transparent',
                color: tab === 'paste' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                borderBottom: tab === 'paste' ? '2px solid var(--cyan)' : 'none'
              }}
            >
              {t('modal_webtool.tab_paste')}
            </button>
          </div>

          {tab === 'url' ? (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>{t('modal_webtool.svg_url')}</label>
              <input
                type="url"
                className="form-input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://cuttle.xyz/api/v1/..."
                style={{ padding: '8px', fontSize: '13px' }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                {t('modal_webtool.cors_hint')}
              </span>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>{t('modal_webtool.svg_xml')}</label>
              <textarea
                className="form-input"
                value={svgCode}
                onChange={e => setSvgCode(e.target.value)}
                placeholder="<svg ...> ... </svg>"
                rows={6}
                style={{ fontFamily: 'monospace', fontSize: '11px', padding: '8px' }}
              />
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--accent-red)', fontSize: '11px', textAlign: 'center', marginTop: '6px' }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>{t('modal_webtool.cancel')}</button>
          <button
            className="btn btn-cyan"
            onClick={handleImport}
            disabled={loading}
            style={{ fontWeight: 'bold' }}
          >
            {loading ? t('modal_webtool.loading') : t('modal_webtool.import')}
          </button>
        </div>
      </div>
    </div>
  );
};
