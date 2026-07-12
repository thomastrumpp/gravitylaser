import json
import os

new_keys = {
    'modal_barcode': {
        'title': {'de': 'Barcode / QR-Code generieren', 'en': 'Generate Barcode / QR-Code', 'es': 'Generar Código de Barras / QR', 'ru': 'Сгенерировать штрихкод / QR', 'zh': '生成条形码/二维码'},
        'type': {'de': 'Typ', 'en': 'Type', 'es': 'Tipo', 'ru': 'Тип', 'zh': '类型'},
        'scale': {'de': 'Skalierung', 'en': 'Scale', 'es': 'Escala', 'ru': 'Масштаб', 'zh': '比例'},
        'height': {'de': 'Strichhöhe', 'en': 'Bar height', 'es': 'Altura de barra', 'ru': 'Высота штриха', 'zh': '条码高度'},
        'content': {'de': 'Inhalt / Template', 'en': 'Content / Template', 'es': 'Contenido / Plantilla', 'ru': 'Контент / Шаблон', 'zh': '内容/模板'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'},
        'insert': {'de': 'Einfügen', 'en': 'Insert', 'es': 'Insertar', 'ru': 'Вставить', 'zh': '插入'}
    },
    'modal_nesting': {
        'title': {'de': 'Smart Nesting (Materialplatzierung)', 'en': 'Smart Nesting', 'es': 'Anidamiento Inteligente', 'ru': 'Умный нестинг', 'zh': '智能排版'},
        'source': {'de': 'Quellobjekte', 'en': 'Source objects', 'es': 'Objetos fuente', 'ru': 'Исходные объекты', 'zh': '源对象'},
        'all': {'de': 'Alle Objekte auf der Arbeitsfläche', 'en': 'All objects on canvas', 'es': 'Todos los objetos en el lienzo', 'ru': 'Все объекты на холсте', 'zh': '画布上的所有对象'},
        'selected': {'de': 'Nur ausgewählte Objekte', 'en': 'Only selected objects', 'es': 'Solo objetos seleccionados', 'ru': 'Только выбранные объекты', 'zh': '仅选中对象'},
        'padding': {'de': 'Teileabstand (Padding)', 'en': 'Part padding', 'es': 'Separación entre piezas', 'ru': 'Отступ между деталями', 'zh': '零件间距 (Padding)'},
        'edge': {'de': 'Plattenrand-Abstand (Edge Buffer)', 'en': 'Edge Buffer', 'es': 'Margen del borde', 'ru': 'Отступ от края', 'zh': '板材边缘缓冲 (Edge Buffer)'},
        'start': {'de': 'Nesting starten', 'en': 'Start nesting', 'es': 'Iniciar anidamiento', 'ru': 'Начать нестинг', 'zh': '开始排版'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'},
        'error': {'de': 'Fehler beim Nesting', 'en': 'Nesting error', 'es': 'Error de anidamiento', 'ru': 'Ошибка нестинга', 'zh': '排版错误'}
    },
    'modal_macro': {
        'title_edit': {'de': 'Makro bearbeiten', 'en': 'Edit Macro', 'es': 'Editar Macro', 'ru': 'Редактировать макрос', 'zh': '编辑宏'},
        'title_new': {'de': 'Neues Makro', 'en': 'New Macro', 'es': 'Nuevo Macro', 'ru': 'Новый макрос', 'zh': '新建宏'},
        'name': {'de': 'Makroname', 'en': 'Macro name', 'es': 'Nombre del macro', 'ru': 'Имя макроса', 'zh': '宏名称'},
        'commands': {'de': 'G-Code Befehle (Zeilenumbruch separiert)', 'en': 'G-Code commands (newline separated)', 'es': 'Comandos G-Code (separados por salto de línea)', 'ru': 'Команды G-Code (каждая с новой строки)', 'zh': 'G代码命令 (换行分隔)'},
        'hotkey': {'de': 'Tastatur-Shortcut (Hotkey)', 'en': 'Keyboard Shortcut (Hotkey)', 'es': 'Atajo de teclado (Hotkey)', 'ru': 'Горячая клавиша', 'zh': '快捷键 (Hotkey)'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'},
        'save': {'de': 'Speichern', 'en': 'Save', 'es': 'Guardar', 'ru': 'Сохранить', 'zh': '保存'},
        'panel_title': {'de': 'M-Codes & G-Code Makros', 'en': 'M-Codes & G-Code Macros', 'es': 'Macros de Códigos M y G', 'ru': 'Макросы M и G кодов', 'zh': 'M代码与G代码宏'},
        'help_1': {'de': '💡 Einzelklick: Auswählen.', 'en': '💡 Single click: Select.', 'es': '💡 Un clic: Seleccionar.', 'ru': '💡 Один клик: Выбрать.', 'zh': '💡 单击: 选择。'},
        'help_2': {'de': '💡 Doppelklick: Bearbeiten.', 'en': '💡 Double click: Edit.', 'es': '💡 Doble clic: Editar.', 'ru': '💡 Двойной клик: Редактировать.', 'zh': '💡 双击: 编辑。'},
        'help_3': {'de': '⚠️ Sicherheit: Makros werden erst bei Klick auf "Ausführen" gesendet!', 'en': '⚠️ Safety: Macros are only sent when clicking "Run"!', 'es': '⚠️ Seguridad: ¡Los macros solo se envían al hacer clic en "Ejecutar"!', 'ru': '⚠️ Внимание: Макросы отправляются только при нажатии "Выполнить"!', 'zh': '⚠️ 安全: 宏仅在点击“运行”时发送！'},
        'run': {'de': 'Ausführen', 'en': 'Run', 'es': 'Ejecutar', 'ru': 'Выполнить', 'zh': '运行'}
    },
    'modal_gcode_editor': {
        'title': {'de': 'G-Code Editor & Vorschau', 'en': 'G-Code Editor & Preview', 'es': 'Editor y Vista Previa G-Code', 'ru': 'Редактор и предпросмотр G-Code', 'zh': 'G代码编辑器和预览'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'},
        'simulate': {'de': '3D Simulieren', 'en': '3D Simulate', 'es': 'Simular en 3D', 'ru': '3D Симуляция', 'zh': '3D模拟'},
        'run': {'de': 'Jetzt Lasern', 'en': 'Run Laser', 'es': 'Ejecutar Láser', 'ru': 'Запустить лазер', 'zh': '开始激光'}
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

print("Batch 1 locales updated.")
