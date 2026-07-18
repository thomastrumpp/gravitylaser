import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../stores/store';
import { machineStore } from '../stores/machineStore';
import { connectionStore } from '../stores/connectionStore';
import { settingsStore } from '../stores/settingsStore';

export const MachineControl: React.FC = () => {
  const { t } = useTranslation();
  const machineState = useStore(machineStore);
  const connState = useStore(connectionStore);

  // Lokale Zustände für Jogging-Einstellungen
  const [stepSize, setStepSize] = useState<number>(10); // mm
  const [feedRate, setFeedRate] = useState<number>(3000); // mm/min
  const [isLaserFiring, setIsLaserFiring] = useState(false);

  const handleJog = (axis: 'X' | 'Y', direction: 1 | -1) => {
    if (!connState.connected) return;
    let distance = stepSize * direction;
    
    // Software-Limit: Verhindere Fahren außerhalb des Arbeitsbereichs
    const settings = settingsStore.get();
    const workingSize = axis === 'X' ? settings.workingSizeX : settings.workingSizeY;
    const origin = settings.origin;

    let minLimit = 0;
    let maxLimit = workingSize;

    if (origin === 'Center') {
      minLimit = -workingSize / 2;
      maxLimit = workingSize / 2;
    }

    const currentWpos = axis === 'X' ? machineState.wpos.x : machineState.wpos.y;
    
    if (direction === -1 && currentWpos + distance < minLimit) {
      distance = minLimit - currentWpos;
    } else if (direction === 1 && currentWpos + distance > maxLimit) {
      distance = maxLimit - currentWpos;
    }
    
    if (Math.abs(distance) < 0.001) return;

    machineStore.jog(axis, distance, feedRate);
  };

  const handleJogDiag = (dirX: 1 | -1, dirY: 1 | -1) => {
    if (!connState.connected) return;
    let distX = stepSize * dirX;
    let distY = stepSize * dirY;

    const settings = settingsStore.get();
    const origin = settings.origin;

    // Limit X
    let minLimitX = 0;
    let maxLimitX = settings.workingSizeX;
    if (origin === 'Center') {
      minLimitX = -settings.workingSizeX / 2;
      maxLimitX = settings.workingSizeX / 2;
    }
    const currentX = machineState.wpos.x;
    if (dirX === -1 && currentX + distX < minLimitX) {
      distX = minLimitX - currentX;
    } else if (dirX === 1 && currentX + distX > maxLimitX) {
      distX = maxLimitX - currentX;
    }

    // Limit Y
    let minLimitY = 0;
    let maxLimitY = settings.workingSizeY;
    if (origin === 'Center') {
      minLimitY = -settings.workingSizeY / 2;
      maxLimitY = settings.workingSizeY / 2;
    }
    const currentY = machineState.wpos.y;
    if (dirY === -1 && currentY + distY < minLimitY) {
      distY = minLimitY - currentY;
    } else if (dirY === 1 && currentY + distY > maxLimitY) {
      distY = maxLimitY - currentY;
    }

    if (Math.abs(distX) < 0.001 && Math.abs(distY) < 0.001) return;

    let moveParts = '';
    if (Math.abs(distX) >= 0.001) moveParts += `X${distX.toFixed(3)}`;
    if (Math.abs(distY) >= 0.001) moveParts += `Y${distY.toFixed(3)}`;

    if (moveParts) {
      machineStore.sendCommand(`$J=G91 G21 ${moveParts} F${feedRate}`);
    }
  };

  return (
    <div style={{ display: 'flex', flex: '1', flexDirection: 'column' }}>
      <div className="section-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
        
        {/* Positionsanzeige und Status wurden in den zentralen Console Header verschoben */}

        {/* Steuerkreuz (Jogging) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 44px)', gridTemplateRows: 'repeat(3, 44px)', gap: '8px' }}>
            <button className="btn" onClick={() => handleJogDiag(-1, 1)} disabled={!connState.connected} title={t('control.tooltip_diagonal_tl', 'Diagonal links oben')}>↖</button>
            <button className="btn" onClick={() => handleJog('Y', 1)} disabled={!connState.connected} title={t('control.tooltip_y_pos')}>▲</button>
            <button className="btn" onClick={() => handleJogDiag(1, 1)} disabled={!connState.connected} title={t('control.tooltip_diagonal_tr', 'Diagonal rechts oben')}>↗</button>
            
            <button className="btn" onClick={() => handleJog('X', -1)} disabled={!connState.connected} title={t('control.tooltip_x_neg')}>◀</button>
            <button className="btn btn-cyan" onClick={() => machineStore.moveTo(0, 0, 6000)} disabled={!connState.connected} title={t('control.go_origin')}>⌂</button>
            <button className="btn" onClick={() => handleJog('X', 1)} disabled={!connState.connected} title={t('control.tooltip_x_pos')}>▶</button>
            
            <button className="btn" onClick={() => handleJogDiag(-1, -1)} disabled={!connState.connected} title={t('control.tooltip_diagonal_bl', 'Diagonal links unten')}>↙</button>
            <button className="btn" onClick={() => handleJog('Y', -1)} disabled={!connState.connected} title={t('control.tooltip_y_neg')}>▼</button>
            <button className="btn" onClick={() => handleJogDiag(1, -1)} disabled={!connState.connected} title={t('control.tooltip_diagonal_br', 'Diagonal rechts unten')}>↘</button>
          </div>
        </div>

        {/* Jog-Einstellungen */}
        <div className="form-row">
          <div>
            <label className="form-label">{t('control.step')}</label>
            <select
              className="form-input"
              value={stepSize}
              onChange={(e) => setStepSize(parseFloat(e.target.value))}
            >
              <option value="0.1">0.1 mm</option>
              <option value="1">1.0 mm</option>
              <option value="10">10 mm</option>
              <option value="50">50 mm</option>
              <option value="100">100 mm</option>
            </select>
          </div>
          <div>
            <label className="form-label">{t('control.speed')}</label>
            <select
              className="form-input"
              value={feedRate}
              onChange={(e) => setFeedRate(parseInt(e.target.value))}
            >
              <option value="500">500 mm/min</option>
              <option value="1000">1000 mm/min</option>
              <option value="3000">3000 mm/min</option>
              <option value="6000">6000 mm/min</option>
              <option value="10000">10000 mm/min</option>
            </select>
          </div>
        </div>

        {/* Systemaktionen */}
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className="btn" onClick={() => machineStore.home()} disabled={!connState.connected} title={t('control.tooltip_home')}>
            🏠 {t('control.home')}
          </button>
          <button className="btn" onClick={() => machineStore.unlock()} disabled={!connState.connected} title={t('control.tooltip_unlock')}>
            🔓 {t('control.unlock')}
          </button>
          <button className="btn btn-cyan" onClick={() => machineStore.sendCommand('G10 L20 P1 X0 Y0')} disabled={!connState.connected} title={t('control.tooltip_set_zero')}>
            🎯 {t('control.set_zero')}
          </button>
          <button 
            className={`btn ${isLaserFiring ? 'btn-danger' : 'btn-warning'}`} 
            onClick={() => {
              if (isLaserFiring) {
                machineStore.sendCommand('M5');
                setIsLaserFiring(false);
              } else {
                machineStore.sendCommand('M3 S10');
                setIsLaserFiring(true);
              }
            }} 
            disabled={!connState.connected} 
            title={t('control.tooltip_fire_laser')}
            style={{ 
              backgroundColor: isLaserFiring ? 'var(--accent-red)' : 'transparent',
              borderColor: isLaserFiring ? 'var(--accent-red)' : 'var(--accent-orange)',
              color: isLaserFiring ? '#fff' : 'var(--accent-orange)'
            }}
          >
            🔥 {isLaserFiring ? t('control.fire_laser_off') : t('control.fire_laser')}
          </button>
        </div>

      </div>
    </div>
  );
};
