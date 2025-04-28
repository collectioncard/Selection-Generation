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

function getRandEmoji(): string {
    let emoji = [':)', ':(', '>:(', ':D', '>:D', ':^D', ':(', ':D', 'O_O', ':P', '-_-', 'O_-', 'O_o', '𓆉', 'ジ', '⊂(◉‿◉)つ', '	(｡◕‿‿◕｡)', '(⌐■_■)', '<|°_°|>', '<|^.^|>', ':P', ':>', ':C', ':}', ':/', 'ʕ ● ᴥ ●ʔ','(˶ᵔ ᵕ ᵔ˶)'];
    return emoji[Math.floor(Math.random() * emoji.length)];
}

// Drag and drop functionality
let draggedTileID: string | null = null;

// When starting to drag a tile
document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('dragstart', (e) => {
        draggedTileID = (e.target as HTMLElement).dataset.tileid ?? null;
        console.log("Dragging tile:", draggedTileID);
    });
});

const mapDiv = document.getElementById('map');
if (mapDiv) {
    mapDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    mapDiv.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (!draggedTileID) return;
    
        const scene = getScene();
        if (!scene) return;
    
        const worldX = scene.input.activePointer.worldX;
        const worldY = scene.input.activePointer.worldY;
    
        const gridX = Math.floor(worldX / 16);
        const gridY = Math.floor(worldY / 16);
    
        if (gridX < 0 || gridX >= 40 || gridY < 0 || gridY >= 25) {
            console.warn(`Drop position (${gridX}, ${gridY}) is out of bounds.`);
            return;
        }
    
        console.log(`Dropping tileID ${draggedTileID} at (${gridX}, ${gridY})`);
    
        scene.placeTileAt(gridX, gridY, Number(draggedTileID), 'feature');
    
        draggedTileID = null;
        scene.isDraggingTile = false;
    });    
}
