import './style.css'
import {createGame} from "./phaser/TinyTownScene.ts";
import './modelChat/chatbox.ts';

createGame(document.getElementById('map') as HTMLDivElement);

//I'll be sad if anyone removes my funny faces. They bring me joy when stuff doesn't work - Thomas
document.title = "Selection Generation " + getRandEmoji();

function getRandEmoji(): string {
    let emoji = [':)', ':(', '>:(', ':D', '>:D', ':^D', ':(', ':D', 'O_O', ':P', '-_-', 'O_-', 'O_o', '𓆉'];
    return emoji[Math.floor(Math.random() * emoji.length)];
}