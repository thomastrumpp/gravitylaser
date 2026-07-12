import fs from 'fs';
const file = '/home/thomas/Antigravity_Projects/TTS10/frontend/src/lib/panels/MachineControl.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("GcodeEditorModal")) {
  code = code.replace("import { ConnectionState } from '../stores/connectionStore';", "import { ConnectionState } from '../stores/connectionStore';\nimport { GcodeEditorModal } from './GcodeEditorModal';");
  
  code = code.replace("export const MachineControl: React.FC = () => {", "export const MachineControl: React.FC = () => {\n  const [gcodeEditorData, setGcodeEditorData] = useState<{ isOpen: boolean, gcode: string }>({ isOpen: false, gcode: '' });");
  
  // Replace handleStartJob
  code = code.replace(/const handleStartJob = \(\) => {[\s\S]*?gcodeStreamer\.start\(gcode\);\n  };/, `const handleStartJob = () => {
    if (!connState.connected) return;
    const getObjects = (window as any).getCanvasObjectsForGcode;
    if (!getObjects) return;
    const objects = getObjects();
    if (objects.length === 0) {
      alert("Bitte zeichne zuerst ein Objekt auf der Arbeitsfläche.");
      return;
    }
    const gcode = gcodeGen.generate(objects);
    if (gcode.split('\\n').length <= 15) {
      alert("Es konnte kein G-Code generiert werden.");
      return;
    }
    setGcodeEditorData({ isOpen: true, gcode });
  };`);
  
  // Replace handleSimulateJob
  code = code.replace(/const handleSimulateJob = \(\) => {[\s\S]*?alert\("Simulator ist noch nicht bereit\."\);\n    }\n  };/, `const handleSimulateJob = () => {
    const getObjects = (window as any).getCanvasObjectsForGcode;
    if (!getObjects) return;
    const objects = getObjects();
    if (objects.length === 0) {
      alert("Bitte zeichne zuerst ein Objekt auf der Arbeitsfläche.");
      return;
    }
    const gcode = gcodeGen.generate(objects);
    if (gcode.split('\\n').length <= 15) {
      alert("Es konnte kein G-Code generiert werden.");
      return;
    }
    setGcodeEditorData({ isOpen: true, gcode });
  };`);
  
  // Add GcodeEditorModal to JSX
  code = code.replace("return (", `return (
    <>
      {gcodeEditorData.isOpen && (
        <GcodeEditorModal
          initialGcode={gcodeEditorData.gcode}
          onClose={() => setGcodeEditorData({ isOpen: false, gcode: '' })}
          onRun={(finalGcode) => {
            setGcodeEditorData({ isOpen: false, gcode: '' });
            gcodeStreamer.start(finalGcode);
          }}
          onSimulate={(finalGcode) => {
            setGcodeEditorData({ isOpen: false, gcode: '' });
            if ((window as any).gcodeSimulator) {
              (window as any).gcodeSimulator.simulate(finalGcode);
            } else {
              alert("Simulator ist nicht bereit.");
            }
          }}
        />
      )}`);
      
  code = code.replace("</div>\n  );\n};", "</div>\n    </>\n  );\n};");

  fs.writeFileSync(file, code);
}
