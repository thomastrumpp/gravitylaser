import json

new_keys = {
    'testsuite': {
        'startingGeneration': {'de': 'Starte Generierung für Test', 'en': 'Starting generation for test', 'es': 'Iniciando generación para prueba', 'ru': 'Начало генерации для теста', 'zh': '开始生成测试'},
        'setZAxis': {'de': 'Bitte Z-Achse auf', 'en': 'Please set Z-axis to', 'es': 'Establezca el eje Z en', 'ru': 'Пожалуйста, установите ось Z на', 'zh': '请将Z轴设置为'},
        'pressResume': {'de': 'einstellen und Resume (~) drücken.', 'en': 'and press Resume (~).', 'es': 'y presione Reanudar (~).', 'ru': 'и нажмите Resume (~).', 'zh': '并按恢复 (~)。'},
        'focusTitle': {'de': 'Focus Test (Z-Axis Calibration)', 'en': 'Focus Test (Z-Axis Calibration)', 'es': 'Prueba de enfoque (Calibración Z)', 'ru': 'Тест фокуса (Калибровка оси Z)', 'zh': '焦点测试 (Z轴校准)'},
        'intervalTitle': {'de': 'Interval Test (Engrave Line Density)', 'en': 'Interval Test (Engrave Line Density)', 'es': 'Prueba de intervalo', 'ru': 'Тест интервала', 'zh': '间隔测试'},
        'speedUnit': {'de': 'Speed (mm/min)', 'en': 'Speed (mm/min)', 'es': 'Velocidad (mm/min)', 'ru': 'Скорость (мм/мин)', 'zh': '速度 (mm/min)'},
        'powerUnit': {'de': 'Power (%)', 'en': 'Power (%)', 'es': 'Potencia (%)', 'ru': 'Мощность (%)', 'zh': '功率 (%)'},
        'interval': {'de': 'Interval', 'en': 'Interval', 'es': 'Intervalo', 'ru': 'Интервал', 'zh': '间隔'},
        'passes': {'de': 'Passes', 'en': 'Passes', 'es': 'Pasadas', 'ru': 'Проходы', 'zh': '遍数'},
        'engraveLabel': {'de': 'Material Gravur Test', 'en': 'Material Engrave Test', 'es': 'Prueba de grabado de material', 'ru': 'Тест гравировки материала', 'zh': '材料雕刻测试'},
        'passesTitle': {'de': 'Passes (Durchgänge)', 'en': 'Passes', 'es': 'Pasadas', 'ru': 'Проходы', 'zh': '遍数'},
        'power': {'de': 'Leistung (%)', 'en': 'Power (%)', 'es': 'Potencia (%)', 'ru': 'Мощность (%)', 'zh': '功率 (%)'},
        'cutLabel': {'de': 'Material Schnitt Test', 'en': 'Material Cut Test', 'es': 'Prueba de corte de material', 'ru': 'Тест резки материала', 'zh': '材料切割测试'},
        'errorGeneration': {'de': 'Fehler beim Generieren des Testmusters', 'en': 'Error generating test pattern', 'es': 'Error al generar patrón de prueba', 'ru': 'Ошибка при генерации тестового шаблона', 'zh': '生成测试图案时出错'},
        'sendingToWorkspace': {'de': '🚀 Sende Testpattern an Arbeitsbereich...', 'en': '🚀 Sending test pattern to workspace...', 'es': '🚀 Enviando patrón de prueba...', 'ru': '🚀 Отправка шаблона в рабочую область...', 'zh': '🚀 将测试图案发送到工作区...'},
        'helpPower': {'de': 'Die konstante Laserintensität für alle Fokuslinien von 10% bis 100%.', 'en': 'The constant laser intensity for all focus lines from 10% to 100%.', 'es': 'La intensidad láser constante (10%-100%).', 'ru': 'Постоянная интенсивность лазера (10%-100%).', 'zh': '所有焦点线的恒定激光强度（10%-100%）。'},
        'saveResult': {'de': 'Ergebnis Sichern', 'en': 'Save Result', 'es': 'Guardar resultado', 'ru': 'Сохранить результат', 'zh': '保存结果'},
        'saveZHeight': {'de': 'Perfekte Z-Höhe eintragen (mm)', 'en': 'Enter perfect Z-Height (mm)', 'es': 'Introducir altura Z perfecta (mm)', 'ru': 'Введите идеальную высоту Z (мм)', 'zh': '输入完美的Z高度 (mm)'},
        'saved': {'de': 'Gespeichert', 'en': 'Saved', 'es': 'Guardado', 'ru': 'Сохранено', 'zh': '已保存'},
        'sequenceTitle': {'de': 'Ablauf-Reihenfolge', 'en': 'Sequence Order', 'es': 'Orden de secuencia', 'ru': 'Порядок выполнения', 'zh': '执行顺序'},
        'perfectFocusTitle': {'de': 'Woran erkenne ich den perfekten Fokus?', 'en': 'How do I recognize perfect focus?', 'es': '¿Cómo reconozco el enfoque perfecto?', 'ru': 'Как определить идеальный фокус?', 'zh': '我如何识别完美的焦点？'},
        'intervalExplanationTitle': {'de': 'Woran erkenne ich das perfekte Intervall?', 'en': 'How do I recognize the perfect interval?', 'es': '¿Cómo reconozco el intervalo perfecto?', 'ru': 'Как определить идеальный интервал?', 'zh': '我如何识别完美的间隔？'}
    },
    'modal_webtool': {
        'error_canvas_not_loaded': {'de': 'Arbeitsfläche konnte nicht geladen werden.', 'en': 'Canvas could not be loaded.', 'es': 'No se pudo cargar el lienzo.', 'ru': 'Холст не может быть загружен.', 'zh': '无法加载画布。'},
        'error_invalid_url': {'de': 'Bitte geben Sie eine gültige SVG-URL ein.', 'en': 'Please enter a valid SVG URL.', 'es': 'Introduzca una URL SVG válida.', 'ru': 'Введите действительный URL-адрес SVG.', 'zh': '请输入有效的 SVG URL。'},
        'error_http': {'de': 'HTTP-Fehler', 'en': 'HTTP Error', 'es': 'Error HTTP', 'ru': 'Ошибка HTTP', 'zh': 'HTTP 错误'},
        'error_load': {'de': 'Ladefehler', 'en': 'Load error', 'es': 'Error de carga', 'ru': 'Ошибка загрузки', 'zh': '加载错误'},
        'error_invalid_code': {'de': 'Bitte fügen Sie den SVG-Code ein.', 'en': 'Please paste the SVG code.', 'es': 'Pegue el código SVG.', 'ru': 'Пожалуйста, вставьте код SVG.', 'zh': '请粘贴 SVG 代码。'},
        'error_no_svg': {'de': 'Keine gültigen SVG-Elemente gefunden.', 'en': 'No valid SVG elements found.', 'es': 'No se encontraron elementos SVG válidos.', 'ru': 'Действительные элементы SVG не найдены.', 'zh': '未找到有效的 SVG 元素。'},
        'imported_svg': {'de': 'Importiertes SVG', 'en': 'Imported SVG', 'es': 'SVG importado', 'ru': 'Импортированный SVG', 'zh': '导入的 SVG'},
        'success': {'de': 'SVG erfolgreich importiert!', 'en': 'SVG successfully imported!', 'es': '¡SVG importado correctamente!', 'ru': 'SVG успешно импортирован!', 'zh': 'SVG 成功导入！'},
        'error_import': {'de': 'Importfehler', 'en': 'Import error', 'es': 'Error de importación', 'ru': 'Ошибка импорта', 'zh': '导入错误'},
        'description': {'de': 'Importieren Sie Designs direkt über eine URL (z.B. Cuttle.xyz, GitHub) oder fügen Sie den generierten SVG-Code direkt hier ein.', 'en': 'Import designs directly via URL or paste the generated SVG code here.', 'es': 'Importe diseños directamente mediante URL o pegue el código SVG generado aquí.', 'ru': 'Импортируйте дизайны напрямую по URL или вставьте сгенерированный код SVG здесь.', 'zh': '直接通过 URL 导入设计或在此处粘贴生成的 SVG 代码。'},
        'tab_url': {'de': '🔗 Über URL laden', 'en': '🔗 Load via URL', 'es': '🔗 Cargar mediante URL', 'ru': '🔗 Загрузить по URL', 'zh': '🔗 通过 URL 加载'},
        'tab_paste': {'de': '📋 SVG-Code einfügen', 'en': '📋 Paste SVG Code', 'es': '📋 Pegar código SVG', 'ru': '📋 Вставить код SVG', 'zh': '📋 粘贴 SVG 代码'},
        'cors_hint': {'de': 'Hinweis: Die angeforderte Website muss CORS-Header erlauben.', 'en': 'Note: The requested website must allow CORS headers.', 'es': 'Nota: El sitio web solicitado debe permitir encabezados CORS.', 'ru': 'Примечание: Запрашиваемый веб-сайт должен разрешать заголовки CORS.', 'zh': '注意：请求的网站必须允许 CORS 标头。'},
        'loading': {'de': 'Wird geladen...', 'en': 'Loading...', 'es': 'Cargando...', 'ru': 'Загрузка...', 'zh': '加载中...'}
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

print("Batch 3 ext locales updated.")
