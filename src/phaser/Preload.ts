import Phaser from 'phaser';
import {Tile} from "./Tile.ts";
//import database from 'public/phaserAssets/Assets/TileDatabase.json'

export class Preload extends Phaser.Scene {
    
    tileObjects: Tile[] = [];

    constructor() {
        super('Preload');
    }

    preload() {
        this.load.json('tileDatabase', 'phaserAssets/Assets/TileDatabase.json');
    }

    create() {
        this.scene.start('TinyTown');
        this.createTiles();
    }

    createTiles() {
        const database = this.cache.json.get('tileDatabase');
        const tileData: { TileID: number, Description: string }[] = database.Tilemap_Packed_Tileset;
        this.tileObjects = tileData.map((data) => new Tile(data.TileID, data.Description));
        console.log(this.tileObjects);
    }
}