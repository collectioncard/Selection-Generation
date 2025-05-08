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
    console.log(gameInstance.scene.getScene('TinyTown'))
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

const toggleBtn = document.getElementById('toggle-highlights') as HTMLButtonElement;
let highlightMode = false;
let currentSelection: string | null = null

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

function updateHighlights() {
    const scene = getScene() as any;
    let namesToHighlight: string[];

    if (currentSelection) {
    // find the node for the selected layer
    const node = findNode(currentSelection, scene.layerTree.Root);
    namesToHighlight = node?.Children.map((c: any) => c.Name) || [];
    } else {
    // no selection → highlight top-level layers
    namesToHighlight = scene.layerTree.Root.Children.map((c: any) => c.Name);
    }

    scene.drawLayerHighlights(namesToHighlight);
}

document.getElementById('reset-view')?.addEventListener('click', () => {
    const s = getScene();
    s.resetView();
    s.clearSelection(); 
    currentSelection = null;
    buildLayerTree();
    if (highlightMode) {
        updateHighlights();
    } else {
        s.clearLayerHighlights();
    }
});

const treeContainer = document.getElementById('layer-tree') as HTMLDivElement
treeContainer.classList.add('hidden');

const toggleTreeBtn = document.getElementById('toggle-tree') as HTMLButtonElement;
toggleTreeBtn.addEventListener('click', () => {
  const isHidden = treeContainer.classList.toggle('hidden');
  toggleTreeBtn.textContent = isHidden ? '☰ Layers' : '✖ Close';
});

// Find a node by name in the tree
function findNode(name: string, node: any): any | null {
    if (node.Name === name) return node
    for (const child of node.Children) {
        const found = findNode(name, child)
        if (found) return found
    }
    return null
}

// Create a <li> for a folder or file node
function makeNodeElement(node: any): HTMLLIElement {
    const li = document.createElement('li')
    if (node.Children.length > 0) {
        // Folder
        li.classList.add('folder')
        const label = document.createElement('div')
        label.classList.add('folder-label')
        label.textContent = node.Name    
        li.appendChild(label)

        const childUl = document.createElement('ul')
        childUl.classList.add('nested')
        node.Children.forEach((child: any) => {
        childUl.appendChild(makeNodeElement(child))
        })
        li.appendChild(childUl)

        label.addEventListener('click', () => {
            //Zoom and show all its child layers
            li.classList.toggle('open')
            const scene = getScene()
            scene.selectLayer(node.Name)
            scene.zoomToLayer(node.Name)
            scene.clearSelection()
            currentSelection = node.Name
            if (highlightMode) updateHighlights()
            window.dispatchEvent(
                new CustomEvent('layerSelected', { detail: node.Name })
            )
        })
    } else {
        // File
        li.classList.add('file')
        const label = document.createElement('div')
        label.classList.add('file-label')
        label.textContent = node.Name
        li.appendChild(label)

        label.addEventListener('click', () => {
            //Zoom and show all its child layers
            const scene = getScene()
            scene.selectLayer(node.Name)
            scene.zoomToLayer(node.Name)
            scene.clearSelection()
            currentSelection = node.Name
            if (highlightMode) updateHighlights()
            window.dispatchEvent(
                new CustomEvent('layerSelected', { detail: node.Name })
            )
        })
    }
    return li
}

// Build the entire tree UI
function buildLayerTree() {
    const s    = getScene() as any
    const root = s.layerTree.Root
    treeContainer.innerHTML = ''
    const ul = document.createElement('ul')
    root.Children.forEach((child: any) => {
        ul.appendChild(makeNodeElement(child))
    })
    treeContainer.appendChild(ul)
    if (highlightMode) updateHighlights()
}
// Rebuild on layer changes or selection
window.addEventListener('layerCreated', () => {
    buildLayerTree();
    if (highlightMode) updateHighlights();
});

window.addEventListener('layerSelected', () => {
    if (highlightMode) updateHighlights();
});
console.log("wow1")
console.log("wow2")

function getRandEmoji(): string {
    let emoji = [':)', ':(', '>:(', ':D', '>:D', ':^D', ':(', ':D', 'O_O', ':P', '-_-', 'O_-', 'O_o', '𓆉', 'ジ', '⊂(◉‿◉)つ', '	(｡◕‿‿◕｡)', '(⌐■_■)', '<|°_°|>', '<|^.^|>', ':P', ':>', ':C', ':}', ':/', 'ʕ ● ᴥ ●ʔ','(˶ᵔ ᵕ ᵔ˶)'];
    return emoji[Math.floor(Math.random() * emoji.length)];
}


// which tile is selected from the pallete
console.log("stuff" + document.querySelectorAll<HTMLButtonElement>('.tile-button'))
document.querySelectorAll<HTMLButtonElement>('.tile-button').forEach(button => {
    button.addEventListener('click', () => {
        console.log("clicked")
        const idStr = button.getAttribute('data-tileid');
        const id = idStr ? parseInt(idStr, 10) : null;
        if (id !== null) {
            const scene = getScene();
            scene.setSelectedTileId(id);
        } else {
            console.error("Missing data-tileid on button:", button);
        }
    });
});

const modeButton = document.getElementById('mode-selection');
if (modeButton) {
    const scene = getScene();
    modeButton.textContent = `Mode: ${scene.isPlacingMode ? 'Place' : 'Select'}`;
    modeButton.addEventListener('click', () => {
        scene.isPlacingMode = !scene.isPlacingMode;
        modeButton!.textContent = `Mode: ${scene.isPlacingMode ? 'Place' : 'Select'}`;
    });
}
// buildLayerTree();
buildLayerTree();
