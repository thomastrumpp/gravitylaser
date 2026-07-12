import os
import re

directory = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/'

def scan_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find text outside of tags and inside jsx expressions
    # This is a naive approach, but helpful
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if re.search(r'>\s*[A-ZÄÖÜa-zäöüß][^<]+<', line) and 't(' not in line:
            print(f"{filepath}:{i+1}: {line.strip()}")

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            scan_file(os.path.join(root, file))
