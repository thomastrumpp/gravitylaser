import React from 'react';
import { useStore } from '../stores/store';
import { canvasStore } from '../stores/canvasStore';

interface CanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onClear: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({ onZoomIn, onZoomOut, onFit, onClear }) => {
  const { backgroundMode } = useStore(canvasStore);

  const handleCaptureCamera = async () => {
    try {
      // 1. Trigger Berechtigungs-Abfrage (falls noch nicht erteilt)
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop()); // Direkt wieder schließen

      // 2. Geräte auflisten (Labels sind nun sichtbar)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      let constraints: MediaStreamConstraints = {
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      if (videoDevices.length > 1) {
        // Versuche USB- oder externe Kamera zu finden
        const usbDevice = videoDevices.find(d => 
          d.label.toLowerCase().includes('usb') || 
          d.label.toLowerCase().includes('cam') && 
          !d.label.toLowerCase().includes('integrated') && 
          !d.label.toLowerCase().includes('front')
        ) || videoDevices[videoDevices.length - 1]; // Fallback auf das letzte Gerät in der Liste

        constraints = {
          video: {
            deviceId: { exact: usbDevice.deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
        console.log("Nutze USB-Kamera:", usbDevice.label);
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.position = 'absolute';
      video.style.left = '-9999px';
      video.style.top = '-9999px';
      document.body.appendChild(video);

      // Warte auf echtes Abspielen und Belichtungszeit (ohne Race Conditions)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("Timeout beim Warten auf Videostrom"));
        }, 6000);

        const cleanup = () => {
          clearTimeout(timeout);
          video.onplaying = null;
          video.onerror = null;
        };

        video.onplaying = () => {
          cleanup();
          setTimeout(resolve, 800);
        };

        video.onerror = () => {
          cleanup();
          reject(new Error("Video-Wiedergabefehler"));
        };

        video.srcObject = stream;
        video.play().catch((err) => {
          cleanup();
          reject(err);
        });
      });

      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth || 1280;
      captureCanvas.height = video.videoHeight || 720;
      const ctx = captureCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = captureCanvas.toDataURL('image/png');
        canvasStore.setCameraImage(dataUrl);
      }
      
      document.body.removeChild(video);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Webcam capture failed:", err);
      alert("Kamera-Aufnahme fehlgeschlagen. Bitte stelle sicher, dass die Kamera eingesteckt ist und der Browser die Erlaubnis hat.");
    }
  };

  return (
    <div style={{
      position: 'absolute',
      right: '20px',
      bottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      backgroundColor: 'var(--bg-panel)',
      padding: '6px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-md)',
      zIndex: 100
    }}>
      <button 
        className="tool-button" 
        onClick={onZoomIn} 
        title="Zoom In"
        style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
      </button>
      <button 
        className="tool-button" 
        onClick={onZoomOut} 
        title="Zoom Out"
        style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>-</span>
      </button>
      <button 
        className="tool-button" 
        onClick={onFit} 
        title="Fit to Screen"
        style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <span style={{ fontSize: '16px' }}>⛶</span>
      </button>
      <button 
        className="tool-button" 
        onClick={onClear} 
        title="Leinwand leeren"
        style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <span style={{ fontSize: '16px' }}>🗑️</span>
      </button>
      
      <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
      

      <button 
        className={`tool-button ${backgroundMode === 'camera' ? 'active' : ''}`} 
        onClick={() => {
          canvasStore.setBackgroundMode('camera');
          if (!canvasStore.get().cameraImage) {
            handleCaptureCamera();
          }
        }} 
        title="Kamera Bett-Overlay aktivieren / aufnehmen"
        style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <span style={{ fontSize: '14px' }}>📷</span>
      </button>

      {backgroundMode === 'camera' && (
        <button 
          className="tool-button" 
          onClick={handleCaptureCamera} 
          title="Kamerabild neu aufnehmen"
          style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--cyan)', color: '#000' }}
        >
          <span style={{ fontSize: '14px' }}>🔄</span>
        </button>
      )}
    </div>
  );
};
