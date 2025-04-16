import './style.css'
import {createGame, TinyTownScene} from "./phaser/TinyTownScene.ts";
import './modelChat/chatbox.ts';
// Register tools from the scene to the apiConnector
import { registerTool } from './modelChat/apiConnector.ts';
import { DecorGenerator } from './phaser/featureGenerators/decorGenerator.ts';

let gameInstance: Phaser.Game | null = null;

export function getScene(): TinyTownScene {
    if (!gameInstance) throw Error("Scene does not exist >:(")
    return gameInstance.scene.getScene('TinyTown') as TinyTownScene;
}


gameInstance = await createGame(document.getElementById('map') as HTMLDivElement);

// Register tools here.
// Migrated to making objects, so that generators have a reference to the scene.
const decorGenerator = new DecorGenerator(getScene)
registerTool(decorGenerator.toolCall);

//I'll be sad if anyone removes my funny faces. They bring me joy when stuff doesn't work - Thomas
document.title = "Selection Generation " + getRandEmoji();

// Clear selection button
document.getElementById('clear-selection')?.addEventListener('click', () => {
    const scene = getScene();
    if (scene) {
        scene.clearSelection();
    }
});

function getRandEmoji(): string {
    let emoji = [':)', ':(', '>:(', ':D', '>:D', ':^D', ':(', ':D', 'O_O', ':P', '-_-', 'O_-', 'O_o', '𓆉'];
    return emoji[Math.floor(Math.random() * emoji.length)];
}