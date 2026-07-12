import json

new_keys = {
    'modal_barcode': {
        'tags': {
            'serial': {'de': 'Seriennummer', 'en': 'Serial Number', 'es': 'Número de serie', 'ru': 'Серийный номер', 'zh': '序列号'},
            'date': {'de': 'Datum', 'en': 'Date', 'es': 'Fecha', 'ru': 'Дата', 'zh': '日期'},
            'time': {'de': 'Uhrzeit', 'en': 'Time', 'es': 'Hora', 'ru': 'Время', 'zh': '时间'},
            'week': {'de': 'KW', 'en': 'Week', 'es': 'Semana', 'ru': 'Неделя', 'zh': '周'},
            'csv': {'de': 'CSV Spalte', 'en': 'CSV Column', 'es': 'Columna CSV', 'ru': 'Столбец CSV', 'zh': 'CSV列'}
        },
        'placeholder': {'de': 'z.B. SN-{serial:0001}', 'en': 'e.g. SN-{serial:0001}', 'es': 'ej. SN-{serial:0001}', 'ru': 'напр. SN-{serial:0001}', 'zh': '例如: SN-{serial:0001}'},
        'waiting': {'de': 'Warte auf Eingabe...', 'en': 'Waiting for input...', 'es': 'Esperando entrada...', 'ru': 'Ожидание ввода...', 'zh': '等待输入...'},
        'include_text': {'de': 'Klartext unter dem Barcode anzeigen', 'en': 'Show plaintext below barcode', 'es': 'Mostrar texto plano debajo', 'ru': 'Показать текст под штрихкодом', 'zh': '在条码下方显示纯文本'}
    }
}

langs = ['de', 'en', 'es', 'ru', 'zh']
path = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/locales/'

for lang in langs:
    with open(f'{path}{lang}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for tag_key, trans in new_keys['modal_barcode']['tags'].items():
        if 'tags' not in data['modal_barcode']:
            data['modal_barcode']['tags'] = {}
        data['modal_barcode']['tags'][tag_key] = trans[lang]
        
    for key in ['placeholder', 'waiting', 'include_text']:
        data['modal_barcode'][key] = new_keys['modal_barcode'][key][lang]
            
    with open(f'{path}{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Batch 1 ext locales updated.")
