import json

new_keys = {
    'modal_nesting': {
        'error_canvas': {'de': 'Arbeitsfläche konnte nicht geladen werden.', 'en': 'Canvas could not be loaded.', 'es': 'No se pudo cargar el lienzo.', 'ru': 'Холст не загружен.', 'zh': '画布无法加载。'},
        'error_selection': {'de': 'Bitte wählen Sie zuerst die zu verschachtelnden Objekte auf der Arbeitsfläche aus.', 'en': 'Please select objects to nest first.', 'es': 'Seleccione objetos para anidar primero.', 'ru': 'Сначала выберите объекты для нестинга.', 'zh': '请先选择要排版的对象。'},
        'error_none': {'de': 'Keine nistbaren Vektorobjekte auf der Arbeitsfläche gefunden.', 'en': 'No nestable vector objects found on canvas.', 'es': 'No se encontraron objetos anidables.', 'ru': 'На холсте не найдено векторных объектов для нестинга.', 'zh': '画布上未找到可排版的矢量对象。'},
        'error_packed': {'de': 'Es konnte kein Objekt auf der Arbeitsfläche platziert werden. Bitte verkleinern Sie den Rand (Edge Buffer) oder das Padding.', 'en': 'Could not place any object. Please reduce Edge Buffer or Padding.', 'es': 'No se pudo colocar ningún objeto. Reduzca el margen o separación.', 'ru': 'Не удалось разместить ни одного объекта. Уменьшите отступы.', 'zh': '无法放置任何对象，请减小边缘缓冲或间距。'},
        'success': {'de': 'Erfolgreich {{count}} Objekte verschachtelt!', 'en': 'Successfully nested {{count}} objects!', 'es': '¡{{count}} objetos anidados con éxito!', 'ru': 'Успешно размещено {{count}} объектов!', 'zh': '成功排版 {{count}} 个对象！'},
        'description': {'de': 'Ordnet Ihre ausgewählten oder alle Vektor-Formen platzsparend an, um den Verschnitt auf der Materialplatte zu minimieren.', 'en': 'Arranges your selected or all vector shapes to minimize material waste.', 'es': 'Organiza sus formas para minimizar el desperdicio de material.', 'ru': 'Организует векторные фигуры для минимизации отходов материала.', 'zh': '重新排列选中或所有矢量形状，以最小化材料浪费。'},
        'rotation': {'de': '90°-Rotationen der Teile erlauben', 'en': 'Allow 90° rotation of parts', 'es': 'Permitir rotación de 90° de las partes', 'ru': 'Разрешить поворот деталей на 90°', 'zh': '允许零件 90° 旋转'},
        'locking': {'de': 'Innere Aussparungen gruppieren (Topologie-Locking)', 'en': 'Group inner cutouts (Topology Locking)', 'es': 'Agrupar recortes internos (Topology Locking)', 'ru': 'Группировать внутренние вырезы', 'zh': '内部切口分组 (Topology Locking)'},
        'processing': {'de': '⏳ Berechne...', 'en': '⏳ Processing...', 'es': '⏳ Procesando...', 'ru': '⏳ Обработка...', 'zh': '⏳ 处理中...'}
    }
}

langs = ['de', 'en', 'es', 'ru', 'zh']
path = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/locales/'

for lang in langs:
    with open(f'{path}{lang}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for key in new_keys['modal_nesting']:
        if 'modal_nesting' not in data:
            data['modal_nesting'] = {}
        data['modal_nesting'][key] = new_keys['modal_nesting'][key][lang]
            
    with open(f'{path}{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Batch 1 nesting ext locales updated.")
