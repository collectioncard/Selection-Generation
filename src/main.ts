import './style.css'
import {createGame, TinyTownScene} from "./phaser/TinyTownScene.ts";
import './modelChat/chatbox.ts';
// Register tools from the scene to the apiConnector
import { registerTool } from './modelChat/apiConnector.ts';
import { DecorGenerator } from './phaser/featureGenerators/decorGenerator.ts';
import { ForestGenerator } from './phaser/featureGenerators/forestGenerator.ts';
import { HouseGenerator } from './phaser/featureGenerators/houseGenerator.ts';
import { FullFenceGenerator } from './phaser/featureGenerators/fullFenceGenerator.ts';
import { PartialFenceGenerator } from './phaser/featureGenerators/partialFenceGenerator.ts';
import { TilePlacer } from './phaser/simpleTools/placeTile.ts';
import { FullUndo } from './phaser/simpleTools/undo.ts';
import { boxPlacer } from './phaser/simpleTools/placeBox.ts';
import { boxClear } from './phaser/simpleTools/clear.ts';
import { NameLayerTool } from './phaser/simpleTools/layerTools.ts';
// import { MoveLayerTool } from './phaser/simpleTools/layerTools.ts';
import { SelectLayerTool } from './phaser/simpleTools/layerTools.ts';

let gameInstance: Phaser.Game | null = null;

export function getScene(): TinyTownScene {
    if (!gameInstance) throw Error("Scene does not exist >:(")
    return gameInstance.scene.getScene('TinyTown') as TinyTownScene;
}

gameInstance = await createGame(document.getElementById('map') as HTMLDivElement);

// Register tools here.
// Migrated to making objects, so that generators have a reference to the scene.

// const decorGenerator = new DecorGenerator(getScene)
// registerTool(decorGenerator.toolCall);

// const forestGenerator = new ForestGenerator(getScene)
// registerTool(forestGenerator.toolCall);  

const generators = {
    decor: new DecorGenerator(getScene),
    forest: new ForestGenerator(getScene),
    house: new HouseGenerator(getScene),
    full_fence: new FullFenceGenerator(getScene),
    partial_fence: new PartialFenceGenerator(getScene),
    tile_placer: new TilePlacer(getScene),
    undo: new FullUndo(getScene),
    box: new boxPlacer(getScene),
    clear: new boxClear(getScene),
    name_layer: new NameLayerTool(getScene),
    // move_layer: new MoveLayerTool(getScene),
    select_layer: new SelectLayerTool(getScene),
}

Object.values(generators).forEach(generator => {
    if (generator.toolCall) {
        registerTool(generator.toolCall);
    }
});

//I'll be sad if anyone removes my funny faces. They bring me joy when stuff doesn't work - Thomas
document.title = "Selection Generation " + getRandEmoji();

document.getElementById('all-selection')?.addEventListener('click', () => {
    const scene = getScene();
    if (scene) {
        scene.setSelectionCoordinates(0,0,scene.CANVAS_WIDTH, scene.CANVAS_HEIGHT);
    }
});

//Clear selected tiles button
document.getElementById('clear-selected-tiles')?.addEventListener('click', () => {
    const scene = getScene();
    if (scene) {
        const startX = Math.min(scene.selectionStart.x, scene.selectionEnd.x);
        const startY = Math.min(scene.selectionStart.y, scene.selectionEnd.y);
        const width = Math.abs(scene.selectionEnd.x - scene.selectionStart.x);
        const height = Math.abs(scene.selectionEnd.y - scene.selectionStart.y);
        
        // Use the clear generator from your generators object
        generators.clear.toolCall.invoke({
            x: startX,
            y: startY,
            width: width,
            height: height
        });
    }
});

// Clear selection button
document.getElementById('clear-selection')?.addEventListener('click', () => {
    const scene = getScene();
    if (scene) {
        scene.clearSelection();
    }
});

// Get selection button
document.getElementById('get-Coords')?.addEventListener('click', () => {
    const scene = getScene();
    if (scene) {
        console.log("Selection Start: ", scene.selectionStart, " Selection End: ", scene.selectionEnd);
        var text = "[Selection Starts at: (" + scene.selectionStart.x + ", " + scene.selectionStart.y + "). Selection Ends at: (" + scene.selectionEnd.x + ", " + scene.selectionEnd.y + ").]";
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard:', text);
        }).catch(err => {
            console.error('Error copying text: ', err);
        });
    }
});

const parentDropdown = document.getElementById('parent-dropdown') as HTMLSelectElement;
const childDropdown = document.getElementById('child-dropdown') as HTMLSelectElement;
  
// Find a node by name in the tree
function findNode(name: string, node: any): any | null {
    if (node.Name === name) return node;
    for (const child of node.Children) {
        const found = findNode(name, child);
        if (found) return found;
    }
    return null;
}

function updateHighlights() {
    const scene = getScene();
    const selChild  = childDropdown.value;
    const selParent = parentDropdown.value;
    let namesToHighlight: string[];
  
    if (selChild && selChild !== '__reset__') {
        // highlight children of the currently selected child
        const node = findNode(selChild, (scene as any).layerTree.Root);
        namesToHighlight = node?.Children.map((c: any) => c.Name) || [];
    } else if (selParent && selParent !== '__reset__') {
        // highlight children of the currently selected parent
        const node = findNode(selParent, (scene as any).layerTree.Root);
        namesToHighlight = node?.Children.map((c: any) => c.Name) || [];
    } else {
        // highlight top-level layers
        namesToHighlight = (scene as any).layerTree.Root.Children.map((c: any) => c.Name);
    }
  
    scene.drawLayerHighlights(namesToHighlight);
}
  
// Populate the parent dropdown with root‐level layers
function populateParents() {
    const scene = getScene() as any;
    const tree = scene.layerTree;
    const root = tree.Root;
  
    // reset both dropdowns
    parentDropdown.innerHTML = `<option value="" selected disabled>-- Select Layer --</option>
        <option value="__reset__">🔄 Reset View</option>`;
    childDropdown.innerHTML  = `<option value="">-- Select Sub-Layer --</option>`;
  
    for (const child of root.Children) {
        const opt = document.createElement('option');
        opt.value = child.Name;
        opt.text  = child.Name;
        parentDropdown.add(opt);
    }
}
// Populate children dropdown based on selected parent
function populateChildren(parentName: string) {
    const scene = getScene() as any;
    const root = (scene.layerTree as any).Root;
    const parentNode = findNode(parentName, root);
  
    childDropdown.innerHTML = `<option value="" selected disabled>-- Select Sub-Layer --</option>
        <option value="__reset__">🔄 Reset View</option>`;
    if (!parentNode) return;
  
    for (const child of parentNode.Children) {
        const opt = document.createElement('option');
        opt.value = child.Name;
        opt.text  = child.Name;
        childDropdown.add(opt);
    }
}
  
// When a parent is chosen, show its children
parentDropdown.addEventListener('change', () => {
    const s = getScene();
    const val = parentDropdown.value;
    if (val === '__reset__') {
        s.resetView();
        parentDropdown.value = '';
        childDropdown.innerHTML = `<option value="" disabled>-- Select Sub-Layer --</option>`;
        populateParents();
        if (highlightMode) updateHighlights();
        return;
    }
    if (!val) {
        childDropdown.innerHTML = `<option value="" disabled>-- Select Sub-Layer --</option>`;
    } else {
        // select & zoom that layer
        s.selectLayer(val);
        s.zoomToLayer(val);

        // clear any selection on the map
        s.clearSelection(); 
    
        // then populate the children dropdown
        populateChildren(val);
    }
    if (highlightMode) updateHighlights();
});
  
// When a child is chosen, child becomes the new parent
childDropdown.addEventListener('change', () => {
    const s = getScene();
    const val = childDropdown.value;
    if (val === '__reset__') {
        s.resetView();
        populateParents();
        if (highlightMode) updateHighlights();
        return;
    }
    if (!val) return;
  
    parentDropdown.innerHTML = `<option value="" disabled>-- Select Layer --</option>
    <option value="__reset__">🔄 Reset View</option>
    <option value="${val}" selected>${val}</option>`;

    // focus & zoom to the newly selected layer
    s.selectLayer(val);
    s.zoomToLayer(val);
  
    s.clearSelection(); 
    
    // Populate its own children
    populateChildren(val);

    if (highlightMode) updateHighlights();
});
  
// Whenever the LLM creates a new layer, re-populate the top‐level list
window.addEventListener('layerCreated', () => {
    populateParents();
    if (highlightMode) updateHighlights();
});

window.addEventListener('layerSelected', () => {
    if (highlightMode) updateHighlights();
});

const toggleBtn = document.getElementById('toggle-highlights') as HTMLButtonElement;
let highlightMode = false;

toggleBtn.textContent = 'Enable Highlights';
toggleBtn.addEventListener('click', () => {
    const s = getScene();
    highlightMode = !highlightMode;
    toggleBtn.textContent = highlightMode ? 'Disable Highlights' : 'Enable Highlights';
    if (!highlightMode) {
        s.clearLayerHighlights();
    } else {
        updateHighlights();
    }
});

function getRandEmoji(): string {
    let emoji = [':)', ':(', '>:(', ':D', '>:D', ':^D', ':(', ':D', 'O_O', ':P', '-_-', 'O_-', 'O_o', '𓆉', 'ジ', '⊂(◉‿◉)つ', '	(｡◕‿‿◕｡)', '(⌐■_■)', '<|°_°|>', '<|^.^|>', ':P', ':>', ':C', ':}', ':/', 'ʕ ● ᴥ ●ʔ','(˶ᵔ ᵕ ᵔ˶)'];
    return emoji[Math.floor(Math.random() * emoji.length)];
}