import json

new_keys = {
    'modal_macro': {
        'error_no_name': {'de': 'Name darf nicht leer sein.', 'en': 'Name cannot be empty.', 'es': 'El nombre no puede estar vacío.', 'ru': 'Имя не может быть пустым.', 'zh': '名称不能为空。'},
        'error_no_gcode': {'de': 'G-Code darf nicht leer sein.', 'en': 'G-Code cannot be empty.', 'es': 'El G-Code no puede estar vacío.', 'ru': 'G-Code не может быть пустым.', 'zh': 'G代码不能为空。'},
        'recording': {'de': 'Drücke Tasten...', 'en': 'Press keys...', 'es': 'Presione teclas...', 'ru': 'Нажмите клавиши...', 'zh': '按下按键...'},
        'no_hotkey': {'de': 'Kein Hotkey', 'en': 'No hotkey', 'es': 'Sin atajo', 'ru': 'Нет горячей клавиши', 'zh': '无快捷键'},
        'assign': {'de': '⌨️ Zuweisen', 'en': '⌨️ Assign', 'es': '⌨️ Asignar', 'ru': '⌨️ Назначить', 'zh': '⌨️ 分配'},
        'clear': {'de': 'Clear', 'en': 'Clear', 'es': 'Borrar', 'ru': 'Очистить', 'zh': '清除'}
    }
}

langs = ['de', 'en', 'es', 'ru', 'zh']
path = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/locales/'

for lang in langs:
    with open(f'{path}{lang}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for key in new_keys['modal_macro']:
        data['modal_macro'][key] = new_keys['modal_macro'][key][lang]
            
    with open(f'{path}{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Batch 1 macro ext locales updated.")
