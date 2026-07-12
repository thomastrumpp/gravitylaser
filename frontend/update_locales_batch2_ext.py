import json

new_keys = {
    'modal_print_cut': {
        'error_no_selection': {'de': 'Bitte wählen Sie zuerst eine Vektorform oder ein Fadenkreuz auf der Arbeitsfläche aus.', 'en': 'Please select a vector shape or crosshair on the canvas first.', 'es': 'Seleccione primero una forma vectorial o una cruz en el lienzo.', 'ru': 'Сначала выберите векторную форму или перекрестие на холсте.', 'zh': '请先在画布上选择矢量形状或十字准线。'},
        'error_not_connected': {'de': 'Der Laser ist nicht verbunden. Bitte verbinden Sie sich zuerst.', 'en': 'Laser is not connected. Please connect first.', 'es': 'El láser no está conectado. Conéctese primero.', 'ru': 'Лазер не подключен. Подключитесь сначала.', 'zh': '激光未连接。请先连接。'},
        'error_incomplete': {'de': 'Bitte alle Passmarken (Design & Maschine) vollständig erfassen.', 'en': 'Please capture all registration marks (Design & Machine).', 'es': 'Capture todas las marcas de registro (Diseño y Máquina).', 'ru': 'Пожалуйста, захватите все метки (Дизайн и Станок).', 'zh': '请捕获所有对位标记（设计与机器）。'},
        'step1': {'de': 'Design-Passmarken', 'en': 'Design Marks', 'es': 'Marcas de diseño', 'ru': 'Метки дизайна', 'zh': '设计标记'},
        'step2': {'de': 'Physische Passmarken', 'en': 'Physical Marks', 'es': 'Marcas físicas', 'ru': 'Физические метки', 'zh': '物理标记'},
        'step3': {'de': 'Aktivierung', 'en': 'Activation', 'es': 'Activación', 'ru': 'Активация', 'zh': '激活'},
        'step1_desc': {'de': 'Wählen Sie in Ihrem Design zwei prägnante Punkte als Ausrichtungsmarken aus.', 'en': 'Select two distinct points in your design as registration marks.', 'es': 'Seleccione dos puntos distintos en su diseño como marcas.', 'ru': 'Выберите две четкие точки в дизайне как метки выравнивания.', 'zh': '在设计中选择两个明显的点作为对齐标记。'},
        'set': {'de': 'Gesetzt', 'en': 'Set', 'es': 'Establecido', 'ru': 'Установлено', 'zh': '已设置'},
        'not_set': {'de': 'Nicht gesetzt', 'en': 'Not set', 'es': 'No establecido', 'ru': 'Не установлено', 'zh': '未设置'},
        'set_selection': {'de': 'Auswahl setzen', 'en': 'Set selection', 'es': 'Establecer selección', 'ru': 'Установить выбор', 'zh': '设置选择'},
        'step2_desc': {'de': 'Fahren Sie den Laser nacheinander exakt auf die beiden physisch gedruckten Passmarken und erfassen Sie diese.', 'en': 'Jog the laser exactly to the two physically printed registration marks and capture them.', 'es': 'Mueva el láser exactamente a las marcas impresas y capture su posición.', 'ru': 'Переместите лазер точно к двум напечатанным меткам и захватите их.', 'zh': '将激光移动到两个打印的物理对位标记上并捕获它们。'},
        'capture_position': {'de': 'Position erfassen', 'en': 'Capture position', 'es': 'Capturar posición', 'ru': 'Захватить позицию', 'zh': '捕获位置'},
        'step3_desc': {'de': 'Aktivieren Sie die Ausrichtung. Alle generierten G-Codes werden ab sofort rotiert und verschoben.', 'en': 'Activate alignment. All generated G-Codes will now be rotated and translated.', 'es': 'Activar alineación. Todos los G-Codes generados serán rotados y trasladados.', 'ru': 'Активировать выравнивание. Все G-коды будут повернуты и смещены.', 'zh': '激活对齐。所有生成的G代码现在将被旋转和移动。'},
        'enable_registration': {'de': 'Print & Cut Registrierung aktivieren', 'en': 'Enable Print & Cut registration', 'es': 'Habilitar registro Print & Cut', 'ru': 'Включить регистрацию Print & Cut', 'zh': '启用Print & Cut注册'},
        'adjust_scale': {'de': 'Skalierung anpassen (gleicht Dehnung/Stauchung des Papiers aus)', 'en': 'Adjust scaling (compensates paper stretch/shrink)', 'es': 'Ajustar escala (compensa estiramiento de papel)', 'ru': 'Настроить масштаб (компенсирует растяжение бумаги)', 'zh': '调整缩放（补偿纸张拉伸/收缩）'},
        'back': {'de': 'Zurück', 'en': 'Back', 'es': 'Atrás', 'ru': 'Назад', 'zh': '后退'}
    },
    'modal_camera': {
        'marker_1': {'de': 'Passmarke 1 (Unten-Links bei {{x}}/{{y}} mm)', 'en': 'Mark 1 (Bottom-Left at {{x}}/{{y}} mm)', 'es': 'Marca 1 (Abajo-Izq en {{x}}/{{y}} mm)', 'ru': 'Метка 1 (Снизу-Слева на {{x}}/{{y}} мм)', 'zh': '标记 1 (左下 {{x}}/{{y}} mm)'},
        'marker_2': {'de': 'Passmarke 2 (Unten-Rechts bei {{x}}/{{y}} mm)', 'en': 'Mark 2 (Bottom-Right at {{x}}/{{y}} mm)', 'es': 'Marca 2 (Abajo-Der en {{x}}/{{y}} mm)', 'ru': 'Метка 2 (Снизу-Справа на {{x}}/{{y}} мм)', 'zh': '标记 2 (右下 {{x}}/{{y}} mm)'},
        'marker_3': {'de': 'Passmarke 3 (Oben-Rechts bei {{x}}/{{y}} mm)', 'en': 'Mark 3 (Top-Right at {{x}}/{{y}} mm)', 'es': 'Marca 3 (Arriba-Der en {{x}}/{{y}} mm)', 'ru': 'Метка 3 (Сверху-Справа на {{x}}/{{y}} мм)', 'zh': '标记 3 (右上 {{x}}/{{y}} mm)'},
        'marker_4': {'de': 'Passmarke 4 (Oben-Links bei {{x}}/{{y}} mm)', 'en': 'Mark 4 (Top-Left at {{x}}/{{y}} mm)', 'es': 'Marca 4 (Arriba-Izq en {{x}}/{{y}} mm)', 'ru': 'Метка 4 (Сверху-Слева на {{x}}/{{y}} мм)', 'zh': '标记 4 (左上 {{x}}/{{y}} mm)'},
        
        'error_not_connected': {'de': 'Laser ist nicht verbunden. Bitte per USB verbinden.', 'en': 'Laser is not connected. Please connect via USB.', 'es': 'Láser no conectado. Conéctelo por USB.', 'ru': 'Лазер не подключен. Подключите по USB.', 'zh': '激光未连接。请通过USB连接。'},
        'error_incomplete': {'de': 'Bitte markieren Sie alle 4 Marker im Kamerabild.', 'en': 'Please mark all 4 markers in the camera image.', 'es': 'Por favor marque los 4 marcadores en la imagen.', 'ru': 'Пожалуйста, отметьте все 4 маркера на изображении камеры.', 'zh': '请在相机图像中标出所有 4 个标记。'},
        'success': {'de': 'Kamerakalibrierung erfolgreich berechnet und gespeichert!', 'en': 'Camera calibration successfully calculated and saved!', 'es': '¡Calibración de cámara calculada y guardada!', 'ru': 'Калибровка камеры успешно рассчитана и сохранена!', 'zh': '相机校准已成功计算并保存！'},
        'error_calibration': {'de': 'Kalibrierungsfehler: ', 'en': 'Calibration error: ', 'es': 'Error de calibración: ', 'ru': 'Ошибка калибровки: ', 'zh': '校准错误: '},
        
        'step_1': {'de': 'Marker gravieren', 'en': 'Engrave Markers', 'es': 'Grabar Marcadores', 'ru': 'Гравировка маркеров', 'zh': '雕刻标记'},
        'step_2': {'de': 'Marker markieren ({{count}}/4)', 'en': 'Mark Markers ({{count}}/4)', 'es': 'Marcar Marcadores ({{count}}/4)', 'ru': 'Отметить маркеры ({{count}}/4)', 'zh': '点选标记 ({{count}}/4)'},
        'step_3': {'de': 'Speichern', 'en': 'Save', 'es': 'Guardar', 'ru': 'Сохранить', 'zh': '保存'},
        
        'desc_1': {'de': 'Legen Sie eine flache Platte (z.B. Holz oder Karton) in den Arbeitsbereich. Der Laser wird nun 4 kleine Fadenkreuze an den Ecken gravieren.', 'en': 'Place a flat board in the work area. The laser will now engrave 4 small crosshairs at the corners.', 'es': 'Coloque una tabla plana en el área. El láser grabará 4 cruces en las esquinas.', 'ru': 'Поместите плоскую доску. Лазер выгравирует 4 перекрестия по углам.', 'zh': '将一块平板放置在工作区。激光现在将在四个角落雕刻小十字准线。'},
        
        'safety_1': {'de': 'Schutzbrille aufsetzen', 'en': 'Wear safety glasses', 'es': 'Póngase gafas de seguridad', 'ru': 'Наденьте защитные очки', 'zh': '戴上安全护目镜'},
        'safety_2': {'de': 'Gehäusedeckel schließen', 'en': 'Close enclosure lid', 'es': 'Cierre la tapa del gabinete', 'ru': 'Закройте крышку корпуса', 'zh': '关闭外壳盖'},
        'safety_3': {'de': 'Absaugung / Air Assist einschalten', 'en': 'Turn on exhaust / Air Assist', 'es': 'Encienda el extractor / Air Assist', 'ru': 'Включите вытяжку / Air Assist', 'zh': '开启排气/Air Assist'},
        
        'engraving': {'de': 'Graviere...', 'en': 'Engraving...', 'es': 'Grabando...', 'ru': 'Гравировка...', 'zh': '雕刻中...'},
        'engrave_markers': {'de': '🎯 4 Passmarken gravieren', 'en': '🎯 Engrave 4 Registration Marks', 'es': '🎯 Grabar 4 Marcas', 'ru': '🎯 Выгравировать 4 метки', 'zh': '🎯 雕刻 4 个标记'},
        'skip': {'de': 'Schritt überspringen (falls Marker bereits graviert)', 'en': 'Skip step (if already engraved)', 'es': 'Omitir paso (si ya se grabó)', 'ru': 'Пропустить шаг (если уже выгравировано)', 'zh': '跳过此步 (如果已雕刻)'},
        
        'desc_2': {'de': 'Klicken Sie nacheinander exakt in die Mitte der vier gravierten Kreuze auf dem Bild unten.', 'en': 'Click exactly in the center of the four engraved crosses on the image below in order.', 'es': 'Haga clic exactamente en el centro de las cuatro cruces grabadas.', 'ru': 'Кликните точно в центр четырех выгравированных крестов на изображении.', 'zh': '依次准确点击下方图像中四个雕刻十字的中心。'},
        'click_instruction': {'de': 'Bitte anklicken', 'en': 'Please click', 'es': 'Haga clic', 'ru': 'Пожалуйста, кликните', 'zh': '请点击'},
        'finished_capturing': {'de': 'Alle 4 Marker erfasst! Klicken Sie auf "Weiter".', 'en': 'All 4 markers captured! Click "Next".', 'es': '¡Los 4 marcadores capturados! Haga clic en "Siguiente".', 'ru': 'Все 4 маркера захвачены! Нажмите "Далее".', 'zh': '4个标记已全部捕获！请点击“下一步”。'},
        'reset': {'de': 'Zurücksetzen', 'en': 'Reset', 'es': 'Restablecer', 'ru': 'Сбросить', 'zh': '重置'},
        
        'desc_3': {'de': 'Die 4 erfassten Passmarken werden nun mit den absoluten Koordinaten des Arbeitsbetts abgeglichen. Daraus wird die homographische Transformationsmatrix berechnet.', 'en': 'The 4 captured marks are matched with the absolute bed coordinates to calculate the homographic transformation matrix.', 'es': 'Las 4 marcas se comparan con las coordenadas para calcular la matriz.', 'ru': 'Захваченные метки сопоставляются с координатами станка для расчета матрицы.', 'zh': '捕获的四个标记将与床身绝对坐标进行匹配，以计算单应性变换矩阵。'},
        'point_label': {'de': 'Passmarke {{idx}}: Pixel ({{pxX}}, {{pxY}}) → Maschine ({{mmX}}, {{mmY}} mm)', 'en': 'Mark {{idx}}: Pixel ({{pxX}}, {{pxY}}) → Machine ({{mmX}}, {{mmY}} mm)', 'es': 'Marca {{idx}}: Píxel ({{pxX}}, {{pxY}}) → Máquina ({{mmX}}, {{mmY}} mm)', 'ru': 'Метка {{idx}}: Пиксель ({{pxX}}, {{pxY}}) → Станок ({{mmX}}, {{mmY}} мм)', 'zh': '标记 {{idx}}: 像素 ({{pxX}}, {{pxY}}) → 机器 ({{mmX}}, {{mmY}} mm)'},
        'calculate_save': {'de': 'Kalibrierung berechnen & speichern', 'en': 'Calculate & Save Calibration', 'es': 'Calcular y guardar calibración', 'ru': 'Рассчитать и сохранить', 'zh': '计算并保存校准'},
        'back': {'de': 'Zurück', 'en': 'Back', 'es': 'Atrás', 'ru': 'Назад', 'zh': '后退'}
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

print("Batch 2 ext locales updated.")
