import './style.css'
import {createGame, TinyTownScene} from "./phaser/TinyTownScene.ts";
import { switchChatContext, handleLayerDeleted, handleLayerRenamed, sendSystemMessageToCurrentLayer, getCurrentChatLayerId } from './modelChat/chatbox.ts'; 
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
import { SelectLayerTool } from './phaser/simpleTools/layerTools.ts';

let gameInstance: Phaser.Game | null = null;

export function getScene(): TinyTownScene {
    if (!gameInstance) throw Error("Scene does not exist >:(")
    return gameInstance.scene.getScene('TinyTown') as TinyTownScene;
}

// Wrap the game creation and tool registration in an async function
async function initializeApp() {
    gameInstance = await createGame(document.getElementById('map') as HTMLDivElement);

    const generators = {
        // ... your generators
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
        select_layer: new SelectLayerTool(getScene),
    };

    Object.values(generators).forEach(generator => {
        if (generator.toolCall) {
            registerTool(generator.toolCall);
        }
    });

    document.title = "Selection Generation " + getRandEmoji();

    // --- SETUP EVENT LISTENERS FOR BUTTONS ---
    document.getElementById('all-selection')?.addEventListener('click', () => {
        const scene = getScene();
        if (scene) {
            scene.setSelectionCoordinates(0,0,scene.CANVAS_WIDTH, scene.CANVAS_HEIGHT);
            if (scene.selectionStart && scene.selectionEnd) {
                sendSystemMessageToCurrentLayer(`User selected all tiles. Global coordinates: [0,0] to [${scene.CANVAS_WIDTH-1}, ${scene.CANVAS_HEIGHT-1}]. This is a ${scene.CANVAS_WIDTH}x${scene.CANVAS_HEIGHT} selection.`);
            }
        }
    });

    document.getElementById('clear-selected-tiles')?.addEventListener('click', () => {
        const scene = getScene();
        if (scene) {
            var startX = 0;
            var startY = 0;
            var width = scene.CANVAS_WIDTH;
            var height = scene.CANVAS_HEIGHT;
            if(scene.selectionStart && scene.selectionEnd && (scene.selectionStart.x !== 0 || scene.selectionStart.y !== 0 || scene.selectionEnd.x !== 0 || scene.selectionEnd.y !== 0 )) // check if a selection exists
            {
                startX = Math.min(scene.selectionStart.x, scene.selectionEnd.x);
                startY = Math.min(scene.selectionStart.y, scene.selectionEnd.y);
                width = Math.abs(scene.selectionEnd.x - scene.selectionStart.x) + 1;
                height = Math.abs(scene.selectionEnd.y - scene.selectionStart.y) + 1;
            }
            
            generators.clear.toolCall.invoke({
                x: startX, // This should be 0 if no selection
                y: startY, // This should be 0 if no selection
                width: width,
                height: height
            });
            sendSystemMessageToCurrentLayer(`Cleared tiles in selection: [${startX},${startY}] to [${startX+width-1},${startY+height-1}].`);
        }
    });

    document.getElementById('clear-selection')?.addEventListener('click', () => {
        const scene = getScene();
        if (scene) {
            scene.clearSelection();
            sendSystemMessageToCurrentLayer("Selection has been cleared.");
        }
    });

    document.getElementById('get-Coords')?.addEventListener('click', () => {
        const scene = getScene();
        if (scene && scene.selectionStart && scene.selectionEnd  && (scene.selectionStart.x !== 0 || scene.selectionStart.y !== 0 || scene.selectionEnd.x !== 0 || scene.selectionEnd.y !== 0 )) {
            const startX = Math.min(scene.selectionStart.x, scene.selectionEnd.x);
            const startY = Math.min(scene.selectionStart.y, scene.selectionEnd.y);
            const endX = Math.max(scene.selectionStart.x, scene.selectionEnd.x);
            const endY = Math.max(scene.selectionStart.y, scene.selectionEnd.y);
            const text = `[Selection Starts at: (${startX}, ${startY}). Selection Ends at: (${endX}, ${endY}). Width: ${endX - startX + 1}, Height: ${endY - startY + 1}]`;
            navigator.clipboard.writeText(text).then(() => {
                console.log('Text copied to clipboard:', text);
                sendSystemMessageToCurrentLayer(`Selection coordinates copied to clipboard: ${text}`);
            }).catch(err => {
                console.error('Error copying text: ', err);
            });
        } else {
            sendSystemMessageToCurrentLayer("No active selection to get coordinates from.");
        }
    });

    const toggleBtn = document.getElementById('toggle-highlights') as HTMLButtonElement;
    let highlightMode = false;
    let currentSelectionName: string | null = null;

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
    // --- END OF BUTTON LISTENERS ---


    // Initial build of layer tree and setting "Root" context
    buildLayerTree(); // Build the UI for layers first
    await switchChatContext("Root"); // Explicitly set and initialize "Root" chat
    console.log("Initial chat context set to Root. Current Layer ID:", getCurrentChatLayerId());


    // Event listeners for layer changes from Phaser scene
    window.addEventListener('layerCreated', (event: Event) => {
        const customEvent = event as CustomEvent;
        const newLayerName = customEvent.detail as string;
        buildLayerTree();
        if (highlightMode) updateHighlights();
        // Optional: Automatically switch to the new layer's chat
        // await switchChatContext(newLayerName);
        // console.log(`Switched to newly created layer's chat: ${newLayerName}`);
    });

    window.addEventListener('layerSelected', (event: Event) => { // This is UI-driven selection
        const customEvent = event as CustomEvent;
        const selectedLayerName = customEvent.detail as string;
        currentSelectionName = selectedLayerName; // For highlight logic
        if (highlightMode) updateHighlights();
        // The click handlers in makeNodeElement are already calling switchChatContext
        console.log(`UI Layer selected: ${selectedLayerName}`);
    });

    window.addEventListener('layerDeleted', (event: Event) => {
        const customEvent = event as CustomEvent;
        const deletedLayerId = customEvent.detail as string;
        console.log(`main.ts: layerDeleted event for ${deletedLayerId}`);
        handleLayerDeleted(deletedLayerId); // This will switch to "Root" if current is deleted
        buildLayerTree();
        if (currentSelectionName === deletedLayerId) {
            currentSelectionName = getCurrentChatLayerId(); // Update to new current (likely "Root")
        }
        if (highlightMode) updateHighlights();
    });

    window.addEventListener('layerRenamed', (event: Event) => {
        const customEvent = event as CustomEvent;
        const { oldName, newName } = customEvent.detail as { oldName: string, newName: string };
        console.log(`main.ts: layerRenamed event from ${oldName} to ${newName}`);
        handleLayerRenamed(oldName, newName);
        buildLayerTree();
        if (currentSelectionName === oldName) {
            currentSelectionName = newName;
        }
        if (highlightMode) updateHighlights();
        // If the currently active chat was the one renamed, chatbox's handleLayerRenamed updates its internal currentLayerId.
        // We just need to ensure the UI (title) reflects this, which handleLayerRenamed should do.
    });

    // Tile palette and mode button listeners
    document.querySelectorAll<HTMLButtonElement>('.tile-button').forEach(button => {
        button.addEventListener('click', () => {
            const idStr = button.getAttribute('data-tileid');
            const id = idStr ? parseInt(idStr, 10) : null;
            if (id !== null) {
                const scene = getScene();
                scene.setSelectedTileId(id);
                 sendSystemMessageToCurrentLayer(`User selected tile ID ${id} from the palette.`);
            } else {
                console.error("Missing data-tileid on button:", button);
            }
        });
    });

    const modeButton = document.getElementById('mode-selection');
    if (modeButton) {
        const scene = getScene(); // scene is guaranteed to exist here
        modeButton.textContent = `Mode: ${scene.isPlacingMode ? 'Place' : 'Select'}`;
        modeButton.addEventListener('click', () => {
            scene.isPlacingMode = !scene.isPlacingMode;
            modeButton!.textContent = `Mode: ${scene.isPlacingMode ? 'Place' : 'Select'}`;
            sendSystemMessageToCurrentLayer(`Switched to ${scene.isPlacingMode ? 'Place' : 'Select'} mode.`);
        });
    }
    const treeContainer = document.getElementById('layer-tree') as HTMLDivElement;
    // treeContainer.classList.add('hidden'); // Keep it hidden initially as per original logic

    const toggleTreeBtn = document.getElementById('toggle-tree') as HTMLButtonElement;
    toggleTreeBtn.addEventListener('click', () => {
    const isHidden = treeContainer.classList.toggle('hidden');
    toggleTreeBtn.textContent = isHidden ? '☰ Layers' : '✖ Close';
    });

} // End of initializeApp

// --- Helper functions for layer tree UI (keep as is or move if preferred) ---
function findNode(name: string, node: any): any | null {
    if (!node) return null;
    if (node.Name === name) return node;
    for (const child of node.Children) {
        const found = findNode(name, child);
        if (found) return found;
    }
    return null;
}

function makeNodeElement(node: any, scene: TinyTownScene): HTMLLIElement { // Pass scene
    const li = document.createElement('li');
    const label = document.createElement('div');
    label.textContent = node.Name;

    if (node.Children.length > 0) {
        li.classList.add('folder');
        label.classList.add('folder-label');
        li.appendChild(label);

        const childUl = document.createElement('ul');
        childUl.classList.add('nested');
        node.Children.forEach((child: any) => {
            childUl.appendChild(makeNodeElement(child, scene)); // Pass scene
        });
        li.appendChild(childUl);

        label.addEventListener('click', async (event) => { // Make async
            event.stopPropagation();
            li.classList.toggle('open');
            // const scene = getScene(); // Already have scene
            scene.selectLayer(node.Name);
            scene.zoomToLayer(node.Name);
            scene.clearSelection();
            // currentSelectionName = node.Name; // Handled by layerSelected event
            // if (highlightMode) updateHighlights(); // Handled by layerSelected event
            await switchChatContext(node.Name); // Await this
            window.dispatchEvent(new CustomEvent('layerSelected', { detail: node.Name }));
        });
    } else {
        li.classList.add('file');
        label.classList.add('file-label');
        li.appendChild(label);

        label.addEventListener('click', async (event) => { // Make async
            event.stopPropagation();
            // const scene = getScene(); // Already have scene
            scene.selectLayer(node.Name);
            scene.zoomToLayer(node.Name);
            scene.clearSelection();
            // currentSelectionName = node.Name; // Handled by layerSelected event
            // if (highlightMode) updateHighlights(); // Handled by layerSelected event
            await switchChatContext(node.Name); // Await this
            window.dispatchEvent(new CustomEvent('layerSelected', { detail: node.Name }));
        });
    }
    return li;
}

function buildLayerTree() {
    const scene = getScene() as any;
    if (!scene || !scene.layerTree || !scene.layerTree.Root) {
        console.warn("Scene or layer tree not ready for buildLayerTree");
        return;
    }
    const rootNode = scene.layerTree.Root; // Renamed for clarity
    const treeContainer = document.getElementById('layer-tree') as HTMLDivElement;
    treeContainer.innerHTML = '';
    const ul = document.createElement('ul');

    const rootLi = document.createElement('li');
    rootLi.classList.add('file');
    const rootLabel = document.createElement('div');
    rootLabel.classList.add('file-label');
    rootLabel.textContent = "Root (Global Context)";
    rootLabel.style.fontWeight = "bold";
    rootLi.appendChild(rootLabel);
    rootLabel.addEventListener('click', async () => { // Make async
        // const scene = getScene(); // Already have scene from outer scope
        scene.resetView();
        scene.clearSelection();
        // currentSelectionName = "Root"; // Or null, let layerSelected event handle it
        // if (highlightMode) updateHighlights(); // Handled by layerSelected event
        await switchChatContext("Root"); // Await this
        window.dispatchEvent(new CustomEvent('layerSelected', { detail: "Root" }));
    });
    ul.appendChild(rootLi);

    rootNode.Children.forEach((child: any) => {
        ul.appendChild(makeNodeElement(child, scene)); // Pass scene
    });
    treeContainer.appendChild(ul);
    // if (highlightMode) updateHighlights(); // Not needed here, layerSelected will trigger
}

function updateHighlights() { // Kept as is, ensure currentSelectionName is managed correctly
    const scene = getScene() as any;
     if (!scene || !scene.layerTree || !scene.layerTree.Root) {
        console.warn("Scene or layer tree not ready for updateHighlights");
        return;
    }
    let namesToHighlight: string[];
    const localCurrentSelectionName = getCurrentChatLayerId(); // Use the chat's current layer ID

    if (localCurrentSelectionName && localCurrentSelectionName !== "Root") {
        const node = findNode(localCurrentSelectionName, scene.layerTree.Root);
        if (node && node.Children.length > 0) { // If it's a folder, highlight children
            namesToHighlight = node.Children.map((c: any) => c.Name);
        } else if (node) { // It's a file or empty folder, highlight itself
            namesToHighlight = [node.Name];
        } else { // Fallback if node not found (should not happen for game layers)
            namesToHighlight = scene.layerTree.Root.Children.map((c: any) => c.Name);
        }
    } else { // "Root" or null, highlight top-level game layers
        namesToHighlight = scene.layerTree.Root.Children.map((c: any) => c.Name);
    }
    scene.drawLayerHighlights(namesToHighlight);
}


function getRandEmoji(): string {
    let emoji = [':)', ':(', '>:(', ':D', '>:D', ':^D', ':(', ':D', 'O_O', ':P', '-_-', 'O_-', 'O_o', '𓆉', 'ジ', '⊂(◉‿◉)つ', '(｡◕‿‿◕｡)', '(⌐■_■)', '<|°_°|>', '<|^.^|>', ':P', ':>', ':C', ':}', ':/', 'ʕ ● ᴥ ●ʔ','(˶ᵔ ᵕ ᵔ˶)'];
    return emoji[Math.floor(Math.random() * emoji.length)];
}


// --- START THE APP ---
initializeApp().then(() => {
    console.log("Application initialized successfully.");
}).catch(error => {
    console.error("Failed to initialize application:", error);
});