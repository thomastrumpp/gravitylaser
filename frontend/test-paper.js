const paper = require('paper/dist/paper-full');
paper.setup(new paper.Size(100, 100));

const svg1 = '<svg><circle cx="50" cy="50" r="40" /></svg>';
const svg2 = '<svg><rect x="10" y="10" width="50" height="50" /></svg>';

const item1 = paper.project.importSVG(svg1);
const item2 = paper.project.importSVG(svg2);

console.log("item1 class:", item1.className, "children:", item1.children.map(c => c.className));
console.log("item2 class:", item2.className, "children:", item2.children.map(c => c.className));

// Convert shape to path
function getPath(item) {
    let p = null;
    item.getItems().forEach(child => {
        if (child.className === 'Shape') {
            p = child.toPath();
        } else if (child instanceof paper.PathItem) {
            p = child;
        }
    });
    return p;
}

const p1 = getPath(item1);
const p2 = getPath(item2);

console.log("p1:", p1.className, "has unite:", typeof p1.unite);
console.log("p2:", p2.className, "has subtract:", typeof p2.subtract);

const res = p1.unite(p2);
console.log("res class:", res.className);
console.log("res export:", res.exportSVG({ asString: true }));
