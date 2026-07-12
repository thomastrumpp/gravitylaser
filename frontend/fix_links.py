import os

base_dir = "/home/thomas/Antigravity_Projects/TTS10/frontend"
test_cases_dir = "/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/test_cases"
walkthrough_path = "/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/walkthrough.md"

os.makedirs(os.path.join(base_dir, "tests", "e2e"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "tests", "unit"), exist_ok=True)

# 1. Update Test Case Files & Create Dummy Scripts
for file in os.listdir(test_cases_dir):
    if not file.endswith(".md"): continue
    
    path = os.path.join(test_cases_dir, file)
    with open(path, "r") as f:
        content = f.read()
        
    # Example to replace: `tests/e2e/TC-U-01.01.spec.ts`
    import re
    
    def repl(m):
        script_rel_path = m.group(1)
        abs_path = os.path.join(base_dir, script_rel_path)
        # Create dummy file so the link works
        if not os.path.exists(abs_path):
            with open(abs_path, 'w') as sf:
                sf.write(f"// TODO: Implement test for {script_rel_path}\n")
        return f"[{script_rel_path}](file://{abs_path})"
        
    new_content = re.sub(r"`(tests/(?:e2e|unit)/[^`]+)`", repl, content)
    
    if new_content != content:
        with open(path, "w") as f:
            f.write(new_content)

# 2. Update Walkthrough Dashboard Table
with open(walkthrough_path, "r") as f:
    wt_content = f.read()

wt_new_content = re.sub(r"`(tests/(?:e2e|unit)/[^`]+)`", repl, wt_content)

if wt_new_content != wt_content:
    with open(walkthrough_path, "w") as f:
        f.write(wt_new_content)

print("Links updated and dummy test scripts created.")
