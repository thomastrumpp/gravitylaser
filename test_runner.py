import os
import subprocess
import json
import re

ROOT_DIR = "/home/thomas/Antigravity_Projects/TTS10"
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
WALKTHROUGH_PATH = "/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/walkthrough.md"

def run_tests():
    results = {}

    # 1. Vitest (Frontend Unit)
    print("Running Vitest (Frontend Unit)...")
    res = subprocess.run(
        ["npm", "run", "test:unit", "--", "--run", "--reporter=json"],
        cwd=FRONTEND_DIR,
        capture_output=True,
        text=True
    )
    # Parse Vitest JSON output (usually in stdout)
    try:
        # Find JSON block in output since vitest might print other warnings
        json_match = re.search(r'\{.*\}', res.stdout, re.DOTALL)
        if json_match:
            v_data = json.loads(json_match.group(0))
            if 'testResults' in v_data:
                for tr in v_data['testResults']:
                    for assertion in tr.get('assertionResults', []):
                        name = assertion.get('title', '')
                        status = assertion.get('status')
                        match = re.search(r'(TC-[A-Z]-\d+\.\d+)', name)
                        if match:
                            results[match.group(1)] = "🟢 Pass" if status == "passed" else "🔴 Fail"
    except Exception as e:
        print("Vitest parsing error:", e)

    # 2. Playwright (Frontend E2E)
    print("Running Playwright (Frontend E2E)...")
    res = subprocess.run(
        ["npx", "playwright", "test", "--reporter=json"],
        cwd=FRONTEND_DIR,
        capture_output=True,
        text=True
    )
    try:
        pw_data = json.loads(res.stdout)
        for suite in pw_data.get('suites', []):
            for spec in suite.get('specs', []):
                name = spec.get('title', '')
                ok = spec.get('ok', False)
                match = re.search(r'(TC-[A-Z]-\d+\.\d+)', name)
                if match:
                    results[match.group(1)] = "🟢 Pass" if ok else "🔴 Fail"
    except Exception as e:
        print("Playwright parsing error:", e)

    # 3. Pytest (Backend)
    print("Running Pytest (Backend)...")
    res = subprocess.run(
        ["uv", "run", "pytest", "--tb=short", "-q"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True
    )
    # Pytest simple parsing (just look for PASS/FAIL lines with TC- ids)
    for line in res.stdout.split('\n'):
        match = re.search(r'(TC-[A-Z]-\d+\.\d+).*?(PASSED|FAILED)', line)
        if match:
            results[match.group(1)] = "🟢 Pass" if match.group(2) == "PASSED" else "🔴 Fail"

    return results

def update_walkthrough(results):
    print("Updating Walkthrough Dashboard...")
    with open(WALKTHROUGH_PATH, "r") as f:
        content = f.read()

    # We replace the status emoji in the markdown table
    def repl_status(match):
        tc_id = match.group(1)
        # Default to 🟡 Not Run if not found in results
        new_status = results.get(tc_id, "🟡 Not Run")
        # Ensure we just put the emoji + text back into the column
        return f"{tc_id}** | [Definition](...) | `...` | {new_status} |"

    # Regex looks for: `**TC-U-01.01** | [Definition]... | `tests/...` | 🟢 |`
    # We will use a simpler regex that replaces the last column based on TC ID
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        match = re.search(r'\*\*(TC-[A-Z]-\d+\.\d+)\*\*', line)
        if match:
            tc_id = match.group(1)
            new_status = results.get(tc_id, "🟡 Not Run")
            # Replace the last cell `| 🟢 |` or similar with the new status
            lines[i] = re.sub(r'\|[^|]+\|$', f"| {new_status} |", line)

    with open(WALKTHROUGH_PATH, "w") as f:
        f.write('\n'.join(lines))
    print("Walkthrough updated successfully.")

if __name__ == "__main__":
    res = run_tests()
    update_walkthrough(res)
