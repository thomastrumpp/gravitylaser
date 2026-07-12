import json
import os

new_keys = {
    'modal_batch': {
        'title': {'de': 'Serienfertigung / CSV-Kopplung', 'en': 'Batch Production / CSV Link', 'es': 'Producción por lotes / Enlace CSV', 'ru': 'Серийное производство / CSV', 'zh': '批量生产 / CSV关联'},
        'start_val': {'de': 'Startwert', 'en': 'Start Value', 'es': 'Valor inicial', 'ru': 'Начальное значение', 'zh': '起始值'},
        'step_val': {'de': 'Schrittweite', 'en': 'Step Size', 'es': 'Tamaño del paso', 'ru': 'Шаг', 'zh': '步长'},
        'format': {'de': 'Formatierung', 'en': 'Formatting', 'es': 'Formato', 'ru': 'Форматирование', 'zh': '格式化'},
        'safety_delay': {'de': 'Sicherheits-Verzögerung:', 'en': 'Safety Delay:', 'es': 'Retraso de seguridad:', 'ru': 'Задержка безопасности:', 'zh': '安全延迟：'},
        'seconds_hint': {'de': 'Sekunden (für Werkstückwechsel)', 'en': 'Seconds (for workpiece change)', 'es': 'Segundos (para cambio de pieza)', 'ru': 'Секунд (для смены заготовки)', 'zh': '秒（用于更换工件）'},
        'data_preview': {'de': 'Daten-Vorschau', 'en': 'Data Preview', 'es': 'Vista previa de datos', 'ru': 'Предпросмотр данных', 'zh': '数据预览'},
        'close': {'de': 'Schließen', 'en': 'Close', 'es': 'Cerrar', 'ru': 'Закрыть', 'zh': '关闭'}
    },
    'modal_print_cut': {
        'title': {'de': 'Print & Cut Einrichtungsassistent', 'en': 'Print & Cut Setup Wizard', 'es': 'Asistente de Print & Cut', 'ru': 'Мастер настройки Print & Cut', 'zh': 'Print & Cut 设置向导'},
        'mark1_design': {'de': 'Passmarke 1 (Design)', 'en': 'Registration Mark 1 (Design)', 'es': 'Marca de registro 1 (Diseño)', 'ru': 'Метка 1 (Дизайн)', 'zh': '对位标记 1 (设计)'},
        'mark2_design': {'de': 'Passmarke 2 (Design)', 'en': 'Registration Mark 2 (Design)', 'es': 'Marca de registro 2 (Diseño)', 'ru': 'Метка 2 (Дизайн)', 'zh': '对位标记 2 (设计)'},
        'mark1_laser': {'de': 'Passmarke 1 (Laser)', 'en': 'Registration Mark 1 (Laser)', 'es': 'Marca de registro 1 (Láser)', 'ru': 'Метка 1 (Лазер)', 'zh': '对位标记 1 (激光)'},
        'mark2_laser': {'de': 'Passmarke 2 (Laser)', 'en': 'Registration Mark 2 (Laser)', 'es': 'Marca de registro 2 (Láser)', 'ru': 'Метка 2 (Лазер)', 'zh': '对位标记 2 (激光)'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'}
    },
    'modal_camera': {
        'title': {'de': 'Kamera-Ausrichtungsassistent (Homographie)', 'en': 'Camera Alignment Wizard (Homography)', 'es': 'Asistente de cámara (Homografía)', 'ru': 'Мастер настройки камеры (Гомография)', 'zh': '相机对齐向导 (单应性)'},
        'safety_checklist': {'de': 'Sicherheits-Checkliste:', 'en': 'Safety Checklist:', 'es': 'Lista de seguridad:', 'ru': 'Чек-лист безопасности:', 'zh': '安全检查表：'},
        'captured_points': {'de': 'Erfasste Punkte:', 'en': 'Captured Points:', 'es': 'Puntos capturados:', 'ru': 'Захваченные точки:', 'zh': '捕获的点：'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'}
    }
}

langs = ['de', 'en', 'es', 'ru', 'zh']
path = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/locales/'

for lang in langs:
    with open(f'{path}{lang}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for section, keys in new_keys.items():
        if section not in data:
            data[section] = {}
        for key, trans in keys.items():
            data[section][key] = trans[lang]
            
    with open(f'{path}{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Batch 2 locales updated.")
