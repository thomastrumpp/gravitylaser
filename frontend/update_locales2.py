import json
import os

new_keys = {
    'timeline': {
        'empty': {'de': 'Keine Historie vorhanden. Zeichnen Sie eine Form, um die Zeitleiste zu starten.', 'en': 'No history available. Draw a shape to start the timeline.', 'es': 'No hay historial. Dibuja una forma para iniciar la línea de tiempo.', 'ru': 'Нет истории. Нарисуйте фигуру, чтобы начать.', 'zh': '暂无历史记录。绘制一个形状以启动时间轴。'},
        'start': {'de': 'Start', 'en': 'Start', 'es': 'Inicio', 'ru': 'Старт', 'zh': '开始'}
    },
    'console': {
        'tab_gcode': {'de': 'G-Code Term', 'en': 'G-Code Term', 'es': 'Terminal G-Code', 'ru': 'Терминал G-Code', 'zh': 'G代码终端'},
        'tab_syslog': {'de': 'System Logs', 'en': 'System Logs', 'es': 'Registros del Sistema', 'ru': 'Системные логи', 'zh': '系统日志'},
        'minimize': {'de': 'Konsole minimieren', 'en': 'Minimize console', 'es': 'Minimizar consola', 'ru': 'Свернуть консоль', 'zh': '最小化控制台'},
        'maximize': {'de': 'Konsole maximieren', 'en': 'Maximize console', 'es': 'Maximizar consola', 'ru': 'Развернуть консоль', 'zh': '最大化控制台'},
        'connected': {'de': 'Verbunden', 'en': 'Connected', 'es': 'Conectado', 'ru': 'Подключено', 'zh': '已连接'},
        'disconnected': {'de': 'Getrennt', 'en': 'Disconnected', 'es': 'Desconectado', 'ru': 'Отключено', 'zh': '已断开'},
        'wpos': {'de': 'Arbeitspos. (WPos):', 'en': 'Work Pos (WPos):', 'es': 'Pos de trabajo (WPos):', 'ru': 'Раб. позиция (WPos):', 'zh': '工作坐标 (WPos):'},
        'mpos': {'de': 'Maschinenpos. (MPos):', 'en': 'Machine Pos (MPos):', 'es': 'Pos de máquina (MPos):', 'ru': 'Поз. станка (MPos):', 'zh': '机器坐标 (MPos):'}
    },
    'control': {
        'set_zero': {'de': 'Set Zero', 'en': 'Set Zero', 'es': 'Establecer Cero', 'ru': 'Установить ноль', 'zh': '设置原点'},
        'tooltip_home': {'de': 'Maschine referenzieren (Homing)', 'en': 'Home machine', 'es': 'Mandar a inicio (Homing)', 'ru': 'Поиск начала (Homing)', 'zh': '机器回原点 (Homing)'},
        'tooltip_unlock': {'de': 'Maschine entsperren (Unlock)', 'en': 'Unlock machine', 'es': 'Desbloquear máquina', 'ru': 'Разблокировать станок', 'zh': '解锁机器'},
        'tooltip_set_zero': {'de': 'Aktuelle Position als Nullpunkt setzen', 'en': 'Set current position as zero', 'es': 'Establecer posición actual como cero', 'ru': 'Установить текущую позицию как ноль', 'zh': '将当前位置设为原点'},
        'tooltip_y_pos': {'de': 'Y+ (Hinten)', 'en': 'Y+ (Back)', 'es': 'Y+ (Atrás)', 'ru': 'Y+ (Назад)', 'zh': 'Y+ (后)'},
        'tooltip_y_neg': {'de': 'Y- (Vorne)', 'en': 'Y- (Front)', 'es': 'Y- (Adelante)', 'ru': 'Y- (Вперед)', 'zh': 'Y- (前)'},
        'tooltip_x_pos': {'de': 'X+ (Rechts)', 'en': 'X+ (Right)', 'es': 'X+ (Derecha)', 'ru': 'X+ (Вправо)', 'zh': 'X+ (右)'},
        'tooltip_x_neg': {'de': 'X- (Links)', 'en': 'X- (Left)', 'es': 'X- (Izquierda)', 'ru': 'X- (Влево)', 'zh': 'X- (左)'}
    },
    'job': {
        'export_gcode': {'de': 'G-Code exportieren', 'en': 'Export G-Code', 'es': 'Exportar G-Code', 'ru': 'Экспорт G-Code', 'zh': '导出 G代码'},
        'tooltip_export': {'de': 'G-Code herunterladen', 'en': 'Download G-Code', 'es': 'Descargar G-Code', 'ru': 'Скачать G-Code', 'zh': '下载 G代码'},
        'simulate': {'de': 'Simulieren', 'en': 'Simulate', 'es': 'Simular', 'ru': 'Симулировать', 'zh': '模拟'},
        'tooltip_simulate': {'de': 'Im 3D-Simulator anzeigen', 'en': 'Show in 3D simulator', 'es': 'Mostrar en simulador 3D', 'ru': 'Показать в 3D симуляторе', 'zh': '在3D模拟器中显示'},
        'frame': {'de': 'Rahmen abfahren (Frame)', 'en': 'Frame', 'es': 'Enmarcar (Frame)', 'ru': 'Обход рамки (Frame)', 'zh': '走边框 (Frame)'},
        'tooltip_frame': {'de': 'Laser-Kopf den Umriss des Jobs abfahren lassen', 'en': 'Trace job outline with laser head', 'es': 'Trazar el contorno del trabajo', 'ru': 'Обход контура работы лазером', 'zh': '用激光头描绘工作轮廓'},
        'batch': {'de': 'Serienfertigung (CSV / Serial)', 'en': 'Batch Production (CSV)', 'es': 'Producción en Lote (CSV)', 'ru': 'Серийное производство (CSV)', 'zh': '批量生产 (CSV)'},
        'tooltip_batch': {'de': 'CSV-gestützte Serienproduktion', 'en': 'CSV-backed batch production', 'es': 'Producción por lotes basada en CSV', 'ru': 'Серийное производство на базе CSV', 'zh': '基于CSV的批量生产'},
        'tooltip_start': {'de': 'G-Code generieren und Laserjob starten', 'en': 'Generate G-Code and start job', 'es': 'Generar G-Code e iniciar trabajo', 'ru': 'Сгенерировать G-Code и запустить', 'zh': '生成G代码并开始任务'}
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

print("Locales 2 updated.")
