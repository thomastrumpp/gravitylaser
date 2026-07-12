import json

new_keys = {
    'modal_gcode_editor': {
        'origin_top_left': {'de': 'Hinten Links (Top-Left)', 'en': 'Back Left (Top-Left)', 'es': 'Atrás Izquierda (Top-Left)', 'ru': 'Сзади Слева (Top-Left)', 'zh': '左后 (Top-Left)'},
        'desc_top_left': {'de': 'Stelle den Laserkopf vor dem Start an der hinteren linken Ecke des Materials auf!', 'en': 'Place the laser head at the back-left corner of the material before starting!', 'es': '¡Coloque el cabezal en la esquina posterior izquierda antes de empezar!', 'ru': 'Поместите лазерную головку в левый задний угол материала перед запуском!', 'zh': '开始前将激光头放置在材料左后角！'},
        
        'origin_top_right': {'de': 'Hinten Rechts (Top-Right)', 'en': 'Back Right (Top-Right)', 'es': 'Atrás Derecha (Top-Right)', 'ru': 'Сзади Справа (Top-Right)', 'zh': '右后 (Top-Right)'},
        'desc_top_right': {'de': 'Stelle den Laserkopf vor dem Start an der hinteren rechten Ecke des Materials auf!', 'en': 'Place the laser head at the back-right corner of the material before starting!', 'es': '¡Coloque el cabezal en la esquina posterior derecha antes de empezar!', 'ru': 'Поместите лазерную головку в правый задний угол материала перед запуском!', 'zh': '开始前将激光头放置在材料右后角！'},
        
        'origin_bottom_right': {'de': 'Vorne Rechts (Bottom-Right)', 'en': 'Front Right (Bottom-Right)', 'es': 'Adelante Derecha (Bottom-Right)', 'ru': 'Спереди Справа (Bottom-Right)', 'zh': '右前 (Bottom-Right)'},
        'desc_bottom_right': {'de': 'Stelle den Laserkopf vor dem Start an der vorderen rechten Ecke des Materials auf!', 'en': 'Place the laser head at the front-right corner of the material before starting!', 'es': '¡Coloque el cabezal en la esquina delantera derecha antes de empezar!', 'ru': 'Поместите лазерную головку в правый передний угол материала перед запуском!', 'zh': '开始前将激光头放置在材料右前角！'},
        
        'origin_center': {'de': 'Zentrum / Mitte (Center)', 'en': 'Center', 'es': 'Centro', 'ru': 'Центр', 'zh': '中心'},
        'desc_center': {'de': 'Stelle den Laserkopf vor dem Start exakt in der Mitte des Gravurbereichs auf!', 'en': 'Place the laser head exactly in the center of the engraving area before starting!', 'es': '¡Coloque el cabezal exactamente en el centro del área de grabado antes de empezar!', 'ru': 'Поместите лазерную головку точно в центр области гравировки перед запуском!', 'zh': '开始前将激光头放置在雕刻区域正中心！'},
        
        'origin_bottom_left': {'de': 'Vorne Links (Bottom-Left)', 'en': 'Front Left (Bottom-Left)', 'es': 'Adelante Izquierda (Bottom-Left)', 'ru': 'Спереди Слева (Bottom-Left)', 'zh': '左前 (Bottom-Left)'},
        'desc_bottom_left': {'de': 'Stelle den Laserkopf vor dem Start an der vorderen linken Ecke des Materials auf!', 'en': 'Place the laser head at the front-left corner of the material before starting!', 'es': '¡Coloque el cabezal en la esquina delantera izquierda antes de empezar!', 'ru': 'Поместите лазерную головку в левый передний угол материала перед запуском!', 'zh': '开始前将激光头放置在材料左前角！'},
        
        'generated_gcode': {'de': 'Generierter G-Code', 'en': 'Generated G-Code', 'es': 'G-Code Generado', 'ru': 'Сгенерированный G-Code', 'zh': '生成的G代码'},
        'origin_header': {'de': 'Nullpunkt & Startposition', 'en': 'Origin & Start Position', 'es': 'Origen y Posición de Inicio', 'ru': 'Начальная точка и позиция запуска', 'zh': '原点与起始位置'},
        
        'back_y': {'de': 'HINTEN (Y+)', 'en': 'BACK (Y+)', 'es': 'ATRÁS (Y+)', 'ru': 'СЗАДИ (Y+)', 'zh': '后 (Y+)'},
        'front_y': {'de': 'VORNE (Y-)', 'en': 'FRONT (Y-)', 'es': 'ADELANTE (Y-)', 'ru': 'СПЕРЕДИ (Y-)', 'zh': '前 (Y-)'},
        'left_x': {'de': 'LINKS (X-)', 'en': 'LEFT (X-)', 'es': 'IZQUIERDA (X-)', 'ru': 'СЛЕВА (X-)', 'zh': '左 (X-)'},
        'right_x': {'de': 'RECHTS (X+)', 'en': 'RIGHT (X+)', 'es': 'DERECHA (X+)', 'ru': 'СПРАВА (X+)', 'zh': '右 (X+)'},
        
        'origin_label': {'de': 'Nullpunkt', 'en': 'Origin', 'es': 'Origen', 'ru': 'Ноль', 'zh': '原点'},
        'before_start': {'de': 'Vor dem Start', 'en': 'Before Start', 'es': 'Antes de empezar', 'ru': 'Перед запуском', 'zh': '开始之前'},
        
        'layers_overview': {'de': 'Ebenen- & Job-Übersicht', 'en': 'Layers & Job Overview', 'es': 'Descripción general de capas', 'ru': 'Обзор слоев и работы', 'zh': '图层与任务概览'},
        'no_objects': {'de': 'Keine auszugebenden Objekte auf der Leinwand.', 'en': 'No objects to output on canvas.', 'es': 'No hay objetos para imprimir.', 'ru': 'Нет объектов для вывода.', 'zh': '画布上没有要输出的对象。'},
        
        'mode_engrave': {'de': 'Gravieren', 'en': 'Engrave', 'es': 'Grabar', 'ru': 'Гравировка', 'zh': '雕刻'},
        'mode_cut': {'de': 'Schneiden', 'en': 'Cut', 'es': 'Cortar', 'ru': 'Резка', 'zh': '切割'},
        'mode_manual': {'de': 'Manuell', 'en': 'Manual', 'es': 'Manual', 'ru': 'Вручную', 'zh': '手动'},
        
        'power': {'de': 'Leistung', 'en': 'Power', 'es': 'Potencia', 'ru': 'Мощность', 'zh': '功率'},
        'speed': {'de': 'Geschw.', 'en': 'Speed', 'es': 'Vel.', 'ru': 'Скор.', 'zh': '速度'},
        'passes': {'de': 'Durchgänge', 'en': 'Passes', 'es': 'Pasadas', 'ru': 'Проходы', 'zh': '遍数'},
        
        'unknown_obj': {'de': 'Unbekanntes Objekt', 'en': 'Unknown Object', 'es': 'Objeto desconocido', 'ru': 'Неизвестный объект', 'zh': '未知对象'},
        'obj_rect': {'de': '🔲 Rechteck', 'en': '🔲 Rectangle', 'es': '🔲 Rectángulo', 'ru': '🔲 Прямоугольник', 'zh': '🔲 矩形'},
        'obj_circle': {'de': '⚪ Kreis', 'en': '⚪ Circle', 'es': '⚪ Círculo', 'ru': '⚪ Круг', 'zh': '⚪ 圆形'},
        'obj_image': {'de': '🖼️ Bild', 'en': '🖼️ Image', 'es': '🖼️ Imagen', 'ru': '🖼️ Изображение', 'zh': '🖼️ 图像'},
        'obj_line': {'de': '➖ Linie', 'en': '➖ Line', 'es': '➖ Línea', 'ru': '➖ Линия', 'zh': '➖ 直线'},
        'obj_path': {'de': '🎨 Vektorpfad', 'en': '🎨 Vector Path', 'es': '🎨 Ruta vectorial', 'ru': '🎨 Векторный контур', 'zh': '🎨 矢量路径'},
        
        'points': {'de': 'Punkte', 'en': 'Points', 'es': 'Puntos', 'ru': 'Точки', 'zh': '点'},
        'lines': {'de': 'Zeilen', 'en': 'Lines', 'es': 'Líneas', 'ru': 'Строки', 'zh': '行'}
    }
}

langs = ['de', 'en', 'es', 'ru', 'zh']
path = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/locales/'

for lang in langs:
    with open(f'{path}{lang}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for key in new_keys['modal_gcode_editor']:
        if 'modal_gcode_editor' not in data:
            data['modal_gcode_editor'] = {}
        data['modal_gcode_editor'][key] = new_keys['modal_gcode_editor'][key][lang]
            
    with open(f'{path}{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Batch 1 gcode ext locales updated.")
