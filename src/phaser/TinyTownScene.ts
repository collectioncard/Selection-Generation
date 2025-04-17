import Phaser from 'phaser';

import {Preload} from './Preload';
import {houseGenerator} from "./featureGenerators/houseGenerator";
import {completedSection, generatorInput} from "./featureGenerators/GeneratorInterface.ts";

interface TinyTownSceneData {
    dict: { [key: number]: string };
}

export class TinyTownScene extends Phaser.Scene {
    private readonly SCALE = 1;
    private readonly CANVAS_WIDTH = 40;  //Size in tiles
    private readonly CANVAS_HEIGHT = 25; // ^^^

    // selection box properties
    private selectionBox!: Phaser.GameObjects.Graphics;
    private selectionStart!: Phaser.Math.Vector2;
    private selectionEnd!: Phaser.Math.Vector2;
    private isSelecting: boolean = false;
    private selectedTiles: { x: number; y: number }[] = [];
    
    // set of tile indexes used for tile understanding
    private selectedTileSet = new Set<number>();
    private tileDictionary!: { [key: number]: string };


    constructor() {
        super('TinyTown');
    }

    init(data: TinyTownSceneData) {
        console.log(data);
        this.tileDictionary = data.dict;
        console.log(this.tileDictionary);
    }

    preload() {
        this.load.image(
            'tiny_town_tiles',
            'phaserAssets/Tilemap_Packed.png',
        );
    }

    create() {
        const map = this.make.tilemap({
            tileWidth: 16,
            tileHeight: 16,
            width: 20,
            height: 20,
        });

        const tileSheet = map.addTilesetImage('tiny_town_tiles')!;

        const grassLayer = map.createBlankLayer('base-layer', tileSheet, 0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)!;
        grassLayer.setScale(this.SCALE);

        const featureLayer = map.createBlankLayer('features-layer', tileSheet, 0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)!;
        featureLayer.setScale(this.SCALE);

        //fill the grass layer with 1 of the three options
        for (let y = 0; y < this.CANVAS_HEIGHT; y++) {
            for (let x = 0; x < this.CANVAS_WIDTH; x++) {
                grassLayer.putTileAt(Phaser.Math.Between(0, 2), x, y);
            }
        }
        
        // -------------> DO STUFF HERE <----------------
        this.selectionBox = this.add.graphics();
        this.selectionBox.setDepth(100); 
        
        this.input.on('pointerdown', this.startSelection, this);
        this.input.on('pointermove', this.updateSelection, this);
        this.input.on('pointerup', this.endSelection, this);

        //Feature generator demo -- Erase if you don't need this
        // 1. Create a generatorInput obj with a 2D array the size of the feature you want. (min is 5x5 for most I think?)
        const houseInput: generatorInput = {
            grid: new Array(5).fill(-1).map(() => new Array(5).fill(-1)),
            width: 5,
            height: 5
        };
        
        // 2. Pass it to the generator you want. House in this case.
        const generatedData: completedSection = houseGenerator.generate(houseInput)
        
        // 3. Put that somewhere in the feature layer. 1,1 for this example.
        featureLayer.putTilesAt(generatedData.grid, 1, 1);
      
        
    }

    startSelection(pointer: Phaser.Input.Pointer): void {
        // Convert screen coordinates to tile coordinates
        const x: number = Math.floor(pointer.x / (16 * this.SCALE));
        const y: number = Math.floor(pointer.y / (16 * this.SCALE));
        
        // Only start selection if within map bounds
        if (x >= 0 && x < this.CANVAS_WIDTH && y >= 0 && y < this.CANVAS_HEIGHT) {
            this.isSelecting = true;
            this.selectionStart = new Phaser.Math.Vector2(x, y);
            this.selectionEnd = new Phaser.Math.Vector2(x, y);
            this.drawSelectionBox();
        }
    }
    
    updateSelection(pointer: Phaser.Input.Pointer): void {
        if (!this.isSelecting) return;
        
        // Convert screen coordinates to tile coordinates
        const x: number = Math.floor(pointer.x / (16 * this.SCALE));
        const y: number = Math.floor(pointer.y / (16 * this.SCALE));
        
        // Clamp to map bounds
        const clampedX: number = Phaser.Math.Clamp(x, 0, this.CANVAS_WIDTH - 1);
        const clampedY: number = Phaser.Math.Clamp(y, 0, this.CANVAS_HEIGHT - 1);
        
        this.selectionEnd.set(clampedX, clampedY);
        this.drawSelectionBox();
    }
    
    endSelection() {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        this.collectSelectedTiles();
        
        // Logs the selected tiles for now

        //Tile understanding: Given the tile indexes, return the descriptions based on the dictionary
        console.log('Selected Tiles:', this.selectedTiles);
        // loop through selectedTileSet once it works
        for (let tileID of this.selectedTileSet) {
            const description = this.tileDictionary[tileID];
            console.log(`TileID ${tileID}: ${description}`);
        }
    }
    
    drawSelectionBox() {
        this.selectionBox.clear();
        
        if (!this.isSelecting) return;
        
        // Calculate the bounds of the selection
        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        // Draw a semi-transparent rectangle
        this.selectionBox.fillStyle(0x00ff00, 0.3);
        this.selectionBox.fillRect(
            startX * 16 * this.SCALE, 
            startY * 16 * this.SCALE, 
            (endX - startX + 1) * 16 * this.SCALE, 
            (endY - startY + 1) * 16 * this.SCALE
        );
        
        // Draw a border
        this.selectionBox.lineStyle(2, 0x00ff00, 1);
        this.selectionBox.strokeRect(
            startX * 16 * this.SCALE, 
            startY * 16 * this.SCALE, 
            (endX - startX + 1) * 16 * this.SCALE, 
            (endY - startY + 1) * 16 * this.SCALE
        );
    }
    
    collectSelectedTiles() {
        this.selectedTiles = [];
        
        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                this.selectedTiles.push({ x, y });
                //additionally, add tileIDs to selectedTileSet
            }
        }
    }

    clearSelection(){
        this.isSelecting = false;
        this.selectionBox.clear();
        this.selectedTiles = [];
        console.log('Selection cleared');
    }
}

export function createGame(attachPoint: HTMLDivElement) {
    const config = {
        type: Phaser.AUTO,
        width: 640,
        height: 400,
        parent: attachPoint,
        scene: [Preload, TinyTownScene]
    };

    return new Phaser.Game(config);
}