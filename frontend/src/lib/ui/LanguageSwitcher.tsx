import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', short: 'DE' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
  { code: 'es', label: 'Español', flag: '🇪🇸', short: 'ES' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', short: 'RU' },
  { code: 'zh', label: '中文', flag: '🇨🇳', short: 'ZH' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="language-switcher" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        className="menu-button" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          height: '28px'
        }}
        title="Sprache wechseln / Change Language"
      >
        <span style={{ fontSize: '14px' }}>{currentLang.flag}</span>
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{currentLang.short}</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          minWidth: '120px',
          overflow: 'hidden'
        }}>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                background: currentLang.code === lang.code ? 'var(--hover-bg)' : 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={(e) => {
                if (currentLang.code !== lang.code) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '14px' }}>{lang.flag}</span>
              <span style={{ fontSize: '13px' }}>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
