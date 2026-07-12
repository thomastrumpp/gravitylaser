import json
import os

new_keys = {
    'nav': {
        'project_save': {'de': 'Projekt speichern', 'en': 'Save Project', 'es': 'Guardar Proyecto', 'ru': 'Сохранить проект', 'zh': '保存项目'},
        'project_load': {'de': 'Projekt laden', 'en': 'Load Project', 'es': 'Cargar Proyecto', 'ru': 'Загрузить проект', 'zh': '加载项目'},
        'config_save': {'de': 'Konfig speichern', 'en': 'Save Config', 'es': 'Guardar Configuración', 'ru': 'Сохранить конфиг', 'zh': '保存配置'},
        'config_load': {'de': 'Konfig laden', 'en': 'Load Config', 'es': 'Cargar Configuración', 'ru': 'Загрузить конфиг', 'zh': '加载配置'},
        'bundle_export': {'de': 'Bundle exportieren', 'en': 'Export Bundle', 'es': 'Exportar Bundle', 'ru': 'Экспорт бандла', 'zh': '导出 Bundle'},
        'bundle_import': {'de': 'Bundle importieren', 'en': 'Import Bundle', 'es': 'Importar Bundle', 'ru': 'Импорт бандла', 'zh': '导入 Bundle'},
        'gcode_export': {'de': 'G-Code exportieren', 'en': 'Export G-Code', 'es': 'Exportar G-Code', 'ru': 'Экспорт G-Code', 'zh': '导出 G-Code'},
        'testsuite': {'de': 'Testsuite', 'en': 'Testsuite', 'es': 'Suite de Pruebas', 'ru': 'Тесты', 'zh': '测试套件'},
        'print_cut': {'de': 'Print & Cut', 'en': 'Print & Cut', 'es': 'Imprimir y Cortar', 'ru': 'Print & Cut', 'zh': '打印与切割'},
        'nesting': {'de': 'Nesting', 'en': 'Nesting', 'es': 'Nesting (Anidamiento)', 'ru': 'Нестинг', 'zh': '排版'},
        'settings': {'de': 'Einstellungen', 'en': 'Settings', 'es': 'Ajustes', 'ru': 'Настройки', 'zh': '设置'}
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

print("Locales updated.")
