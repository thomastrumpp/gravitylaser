import json

new_keys = {
    'modal_testsuite': {
        'title': {'de': 'Material Testsuite & Z-Höhen-Kalibrierung', 'en': 'Material Testsuite & Z-Height Calibration', 'es': 'Conjunto de pruebas de material y calibración', 'ru': 'Тесты материала и калибровка оси Z', 'zh': '材料测试套件与Z轴高度校准'},
        'save_result': {'de': 'Ergebnis Sichern', 'en': 'Save Result', 'es': 'Guardar resultado', 'ru': 'Сохранить результат', 'zh': '保存结果'},
        'z_height': {'de': 'Perfekte Z-Höhe eintragen (mm)', 'en': 'Enter perfect Z-Height (mm)', 'es': 'Introducir altura Z perfecta (mm)', 'ru': 'Введите идеальную высоту Z (мм)', 'zh': '输入完美的Z高度 (mm)'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'},
        'save': {'de': 'Speichern & Übernehmen', 'en': 'Save & Apply', 'es': 'Guardar y Aplicar', 'ru': 'Сохранить и Применить', 'zh': '保存并应用'}
    },
    'modal_webtool': {
        'title': {'de': 'Web-Tool & Cuttle.xyz Importer', 'en': 'Web-Tool & Cuttle.xyz Importer', 'es': 'Herramienta web e Importador Cuttle.xyz', 'ru': 'Web-Tool & Cuttle.xyz Importer', 'zh': '网页工具与Cuttle.xyz导入器'},
        'svg_url': {'de': 'SVG-URL (Cuttle/Web)', 'en': 'SVG-URL (Cuttle/Web)', 'es': 'URL de SVG (Cuttle/Web)', 'ru': 'SVG-URL (Cuttle/Web)', 'zh': 'SVG链接 (Cuttle/Web)'},
        'svg_xml': {'de': 'SVG XML Code', 'en': 'SVG XML Code', 'es': 'Código XML de SVG', 'ru': 'Код SVG XML', 'zh': 'SVG XML 代码'},
        'cancel': {'de': 'Abbrechen', 'en': 'Cancel', 'es': 'Cancelar', 'ru': 'Отмена', 'zh': '取消'},
        'import': {'de': 'Importieren', 'en': 'Import', 'es': 'Importar', 'ru': 'Импорт', 'zh': '导入'}
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

print("Batch 3 locales updated.")
