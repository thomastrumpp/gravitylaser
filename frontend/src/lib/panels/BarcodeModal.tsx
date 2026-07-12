import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarcodeService } from '../services/BarcodeService';

interface BarcodeModalProps {
  onClose: () => void;
}

const BARCODE_TYPES = [
  { value: 'qrcode', label: 'QR-Code (2D)' },
  { value: 'datamatrix', label: 'DataMatrix (2D)' },
  { value: 'pdf417', label: 'PDF417 (2D)' },
  { value: 'code128', label: 'Code 128 (1D)' },
  { value: 'ean13', label: 'EAN-13 (1D)' },
  { value: 'ean8', label: 'EAN-8 (1D)' },
  { value: 'upca', label: 'UPC-A (1D)' },
  { value: 'code39', label: 'Code 39 (1D)' },
  { value: 'itf14', label: 'ITF-14 (1D)' },
  { value: 'aruco', label: 'ArUco Marker (Robotics)' },
  { value: 'apriltag36h11', label: 'AprilTag (36h11)' }
];

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [type, setType] = useState('qrcode');
  const [text, setText] = useState('SN-{serial:0001}');
  const [scale, setScale] = useState(3);
  const [height, setHeight] = useState(10);
  const [includeText, setIncludeText] = useState(true);
  const [previewSvg, setPreviewSvg] = useState('');
  const [error, setError] = useState('');

  // Live-Vorschau generieren
  useEffect(() => {
    if (!text.trim()) {
      setPreviewSvg('');
      setError('');
      return;
    }

    try {
      // Für die Vorschau ersetzen wir eventuelle Variablen durch statische Dummy-Werte
      const dummyText = text
        .replace(/{date[^}]*}/g, new Date().toLocaleDateString())
        .replace(/{time[^}]*}/g, '12:00')
        .replace(/{week}/g, '28')
        .replace(/{serial[^}]*}/g, '0001')
        .replace(/{csv:[^}]*}/g, 'CSV-Wert');

      const svg = BarcodeService.generateSVG(type, dummyText, {
        scale: 2, // Etwas kleiner für die Vorschau
        height: type.includes('qrcode') || type.includes('datamatrix') ? undefined : height,
        includetext: includeText
      });
      setPreviewSvg(svg);
      setError('');
    } catch (err: any) {
      setError(err.message);
      setPreviewSvg('');
    }
  }, [type, text, scale, height, includeText]);

  const insertTemplateTag = (tag: string) => {
    setText(prev => prev + tag);
  };

  const handleInsert = () => {
    try {
      const svg = BarcodeService.generateSVG(type, text, {
        scale,
        height,
        includetext: includeText
      });

      // Sende geladenes SVG inklusive Metadaten an das Canvas
      window.dispatchEvent(new CustomEvent('loadSVG', {
        detail: {
          svg,
          barcode: {
            bcid: type,
            template: text,
            scale,
            height
          }
        }
      }));

      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '650px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('modal_barcode.title')}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('modal_barcode.type')}</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="input-select"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              >
                {BARCODE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('modal_barcode.scale')}</label>
              <input 
                type="number" 
                value={scale} 
                min={1}
                max={10}
                onChange={e => setScale(Number(e.target.value))}
                className="input-number"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            {!['qrcode', 'datamatrix'].includes(type) && (
              <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('modal_barcode.height')}</label>
                <input 
                  type="number" 
                  value={height} 
                  min={5}
                  max={50}
                  onChange={e => setHeight(Number(e.target.value))}
                  className="input-number"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{t('modal_barcode.content')}</label>
            <input 
              type="text" 
              value={text} 
              onChange={e => setText(e.target.value)}
              placeholder={t('modal_barcode.placeholder')}
              className="input-text"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => insertTemplateTag('{serial:0001}')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              + {t('modal_barcode.tags.serial')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => insertTemplateTag('{date:yyyy-MM-dd}')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              + {t('modal_barcode.tags.date')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => insertTemplateTag('{time:HH:mm}')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              + {t('modal_barcode.tags.time')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => insertTemplateTag('{week}')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              + {t('modal_barcode.tags.week')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => insertTemplateTag('{csv:Spalte}')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              + {t('modal_barcode.tags.csv')}
            </button>
          </div>

          {!['qrcode', 'datamatrix'].includes(type) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input 
                type="checkbox" 
                checked={includeText} 
                onChange={e => setIncludeText(e.target.checked)}
              />
              {t('modal_barcode.include_text')}
            </label>
          )}

          {/* Live-Vorschau Bereich */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '150px', 
            padding: '16px',
            borderRadius: '6px', 
            backgroundColor: '#ffffff', // Heller Hintergrund für die Barcode-Scanbarkeit
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            {error ? (
              <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
                {error}
              </div>
            ) : previewSvg ? (
              <div 
                dangerouslySetInnerHTML={{ __html: previewSvg }} 
                style={{ display: 'flex', justifyContent: 'center', maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '13px' }}>
                {t('modal_barcode.waiting')}
              </div>
            )}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('modal_barcode.cancel')}</button>
          <button 
            className="btn btn-primary" 
            onClick={handleInsert}
            disabled={!!error || !text.trim()}
          >
            {t('modal_barcode.insert')}
          </button>
        </div>
      </div>
    </div>
  );
};
