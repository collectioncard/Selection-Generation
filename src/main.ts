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
import { RenameLayerTool } from './phaser/simpleTools/layerTools.ts';
import { DeleteLayerTool } from './phaser/simpleTools/layerTools.ts';

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
    rename_layer: new RenameLayerTool(getScene),
    delete_layer: new DeleteLayerTool(getScene),
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
        var startX = 0;
        var startY = 0;
        var width = scene.CANVAS_WIDTH;
        var height = scene.CANVAS_HEIGHT;
        if(scene.selectionStart && scene.selectionEnd)
        {
            startX = Math.min(scene.selectionStart.x, scene.selectionEnd.x);
            startY = Math.min(scene.selectionStart.y, scene.selectionEnd.y);
            width = Math.abs(scene.selectionEnd.x - scene.selectionStart.x);
            height = Math.abs(scene.selectionEnd.y - scene.selectionStart.y);
        }
        
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
        const node = findNode(currentSelection, scene.layerTree.Root);
        const kids = node?.Children || [];

        if (kids.length > 0) {
            namesToHighlight = kids.map((c: any) => c.Name);
        } else {
            namesToHighlight = [];
        }
    } else {
        namesToHighlight = scene.layerTree.Root.Children.map((c: any) => c.Name);
    }

    scene.clearLayerHighlights();

    if (namesToHighlight.length > 0) {
        scene.drawLayerHighlights(namesToHighlight);
    }

    if (currentSelection) {
        scene.drawSingleHighlight(currentSelection, 0xff8800, 0.8);
    }
}

const deleteModal       = document.getElementById('delete-modal')      as HTMLDivElement;
const modalLayerName    = document.getElementById('modal-layer-name') as HTMLSpanElement;
const btnDeleteOnly     = document.getElementById('btn-delete-only')     as HTMLButtonElement;
const btnDeleteWith     = document.getElementById('btn-delete-with-assets') as HTMLButtonElement;
const btnDeleteCancel   = document.getElementById('btn-delete-cancel')   as HTMLButtonElement;

const ctxMenu   = document.getElementById('layer-context-menu') as HTMLDivElement
const ctxRename = document.getElementById('ctx-rename')        as HTMLLIElement
const ctxDelete = document.getElementById('ctx-delete')        as HTMLLIElement
let contextTarget: string | null = null

// hide menu on outside click
document.addEventListener('click', () => {
    ctxMenu.style.display = 'none'
})

// Handle rename from context menu
ctxRename.addEventListener('click', () => {
    if (!contextTarget) return
    const newName = prompt(`Rename "${contextTarget}" to:`)?.trim()
    if (newName) {
        getScene().renameLayer(contextTarget, newName)
        currentSelection = newName
        buildLayerTree()
        if (highlightMode) updateHighlights()
    }
    ctxMenu.style.display = 'none'
})

// Handle delete from context menu
ctxDelete.addEventListener('click', () => {
    if (!contextTarget) return
    modalLayerName.textContent = contextTarget;
    deleteModal.classList.remove('hidden');
    ctxMenu.style.display = 'none'
})

function findParent(childName: string, node: any): any | null {
  for (const c of node.Children) {
    if (c.Name === childName) return node
    const deeper = findParent(childName, c)
    if (deeper) return deeper
  }
  return null
}

function isRoot(node: any, scene: TinyTownScene) {
  return node === (scene as any).layerTree.Root;
}

btnDeleteOnly.addEventListener('click', () => {
    const scene = getScene() as any
    const root = scene.layerTree.Root
    const delName = contextTarget!
    const parentNode = findParent(delName, root)

    scene.deleteLayerOnly(delName)

    // restore selection to parent (or home)
    if (parentNode && !isRoot(parentNode, scene)) {
        const parentName = parentNode.Name
        currentSelection = parentName
        scene.zoomToLayer(parentName)
        scene.setActiveLayer(parentName)
    } else {
        currentSelection = null
        scene.resetView()
        scene.setActiveLayer(null)
    }

    buildLayerTree()
    if (highlightMode) updateHighlights()
    else scene.clearLayerHighlights()

    deleteModal.classList.add('hidden')
});

btnDeleteWith.addEventListener('click', () => {
    const scene = getScene() as any
    const root = scene.layerTree.Root
    const delName = contextTarget!
    const parentNode = findParent(delName, root)

    scene.deleteLayer(delName)

    if (parentNode && !isRoot(parentNode, scene)) {
        const parentName = parentNode.Name
        currentSelection = parentName
        scene.zoomToLayer(parentName)
        scene.setActiveLayer(parentName)
    } else {
        currentSelection = null
        scene.resetView()
        scene.setActiveLayer(null)
    }

    buildLayerTree()
    if (highlightMode) updateHighlights()
    else scene.clearLayerHighlights()

    deleteModal.classList.add('hidden')
});

btnDeleteCancel.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
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

function makeNodeElement(node: any): HTMLLIElement {
    const li = document.createElement('li')
    let label: HTMLDivElement

    // create label and apply base classes
    if (node.Children.length > 0) {
        li.classList.add('folder')
        label = document.createElement('div')
        label.classList.add('folder-label')
    } else {
        li.classList.add('file')
        label = document.createElement('div')
        label.classList.add('file-label')
    }
    label.textContent = node.Name

    // highlight if this is the current selection
    if (node.Name === currentSelection) {
        label.classList.add('selected-label')
    }

    li.appendChild(label)

    // if a folder, recursively build its subtree
    if (node.Children.length > 0) {
        const childUl = document.createElement('ul')
        childUl.classList.add('nested')
        node.Children.forEach((child: any) => {
            childUl.appendChild(makeNodeElement(child))
        })
        li.appendChild(childUl)
    }

    // LEFT-CLICK: toggle open & select/zoom
    label.addEventListener('click', ev => {
        ev.stopPropagation()
        if (node.Children.length > 0) {
            li.classList.toggle('open')
        }
        const scene = getScene()
        scene.selectLayer(node.Name)
        scene.zoomToLayer(node.Name)
        scene.setActiveLayer(node.Name)
        scene.clearSelection()

        currentSelection = node.Name

        if (highlightMode) updateHighlights()

        document
          .querySelectorAll('#layer-tree .selected-label')
          .forEach(el => el.classList.remove('selected-label'))
        label.classList.add('selected-label')

        window.dispatchEvent(
          new CustomEvent('layerSelected', { detail: node.Name })
        )
    })

    label.addEventListener('contextmenu', ev => {
        ev.preventDefault()
        ev.stopPropagation()
        contextTarget = node.Name
        ctxMenu.style.top  = ev.clientY + 'px'
        ctxMenu.style.left = ev.clientX + 'px'
        ctxMenu.style.display = 'block'
    })

    return li
}

// Build the entire tree UI
function buildLayerTree() {
    const s = getScene() as any
    const root = s.layerTree.Root
    treeContainer.innerHTML = ''
    const ul = document.createElement('ul')

    //Home button
    const homeLi = document.createElement('li');
    const homeLabel = document.createElement('div');
    homeLi.classList.add('file');
    homeLabel.classList.add('file-label');
    homeLabel.textContent = 'Home';
    // highlight “Home” when no layer is selected
    if (currentSelection === null) {
        homeLabel.classList.add('selected-label');
    }
    homeLabel.addEventListener('click', () => {
        s.resetView();
        s.clearSelection();
        s.setActiveLayer(null);
        currentSelection = null;
        buildLayerTree();
        if (highlightMode) updateHighlights();
        else s.clearLayerHighlights();
    });
    homeLi.appendChild(homeLabel);
    ul.appendChild(homeLi);

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

window.addEventListener('layerRenamed', (e: Event) => {
    const { oldName, newName } = (e as CustomEvent).detail;
    console.log(`Layer renamed: ${oldName} → ${newName}`);

    currentSelection = newName;

    buildLayerTree();

    // if we’re in highlight mode, refresh highlights now that names changed
    if (highlightMode) {
        updateHighlights();
    } else {
        getScene().clearLayerHighlights();
    }
});

window.addEventListener('layerDeleted', (e: Event) => {
    console.log('layerDeleted:', (e as CustomEvent).detail);
    buildLayerTree();
    if (highlightMode) updateHighlights();
});

buildLayerTree();


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
