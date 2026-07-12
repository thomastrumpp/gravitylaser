import json

new_keys = {
    'modal_macro': {
        'confirm_delete': {'de': 'Möchten Sie dieses Makro wirklich löschen?', 'en': 'Do you really want to delete this macro?', 'es': '¿Realmente desea eliminar este macro?', 'ru': 'Вы действительно хотите удалить этот макрос?', 'zh': '您确定要删除这个宏吗？'},
        'add': {'de': 'Hinzufügen', 'en': 'Add', 'es': 'Añadir', 'ru': 'Добавить', 'zh': '添加'},
        'click_select': {'de': 'Einzelklick: Auswählen.', 'en': 'Single click: Select.', 'es': 'Un clic: Seleccionar.', 'ru': 'Один клик: Выбрать.', 'zh': '单击：选择。'},
        'double_click_edit': {'de': 'Doppelklick: Bearbeiten.', 'en': 'Double click: Edit.', 'es': 'Doble clic: Editar.', 'ru': 'Двойной клик: Редактировать.', 'zh': '双击：编辑。'},
        'safety_warning': {'de': 'Sicherheit: Makros werden erst bei Klick auf "Ausführen" gesendet!', 'en': 'Safety: Macros are only sent when clicking "Run"!', 'es': 'Seguridad: ¡Los macros solo se envían al hacer clic en "Ejecutar"!', 'ru': 'Безопасность: Макросы отправляются только при нажатии "Выполнить"!', 'zh': '安全：宏仅在点击“运行”时发送！'},
        'no_macros': {'de': 'Keine Makros vorhanden.', 'en': 'No macros available.', 'es': 'No hay macros disponibles.', 'ru': 'Нет доступных макросов.', 'zh': '没有可用的宏。'},
        'delete': {'de': 'Makro löschen', 'en': 'Delete Macro', 'es': 'Eliminar macro', 'ru': 'Удалить макрос', 'zh': '删除宏'}
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

print("Batch 1 macropanel ext locales updated.")
