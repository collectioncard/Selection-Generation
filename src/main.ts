import './style.css'
import {createGame, TinyTownScene} from "./phaser/TinyTownScene.ts";
import './modelChat/chatbox.ts';

let gameInstance: Phaser.Game | null = null;

function getScene(): TinyTownScene | null {
    if (!gameInstance) return null;
    return gameInstance.scene.getScene('TinyTown') as TinyTownScene;
}

gameInstance = createGame(document.getElementById('map') as HTMLDivElement);

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