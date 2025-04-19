import Phaser from 'phaser';

import {HouseGenerator} from "./featureGenerators/houseGenerator";
import {completedSection, generatorInput} from "./featureGenerators/GeneratorInterface.ts";

export class TinyTownScene extends Phaser.Scene {
    private readonly SCALE = 1;
    public readonly CANVAS_WIDTH = 40;  //Size in tiles
    public readonly CANVAS_HEIGHT = 25; // ^^^

    // selection box properties
    private selectionBox!: Phaser.GameObjects.Graphics;
    private selectionStart!: Phaser.Math.Vector2;
    private selectionEnd!: Phaser.Math.Vector2;
    private isSelecting: boolean = false;
    private selectedTiles: {
        coordinates: { x: number; y: number }[];  
        dimensions: { width: number; height: number };
        tileGrid: number[][];  // grass layer
        featureGrid: number[][]; // feature layer
      } = {
        coordinates: [],
        dimensions: { width: 0, height: 0 },
        tileGrid: [],
        featureGrid: []
      };    
    private grassLayer : Phaser.Tilemaps.TilemapLayer | null = null;
    private featureLayer : Phaser.Tilemaps.TilemapLayer | null = null;

    constructor() {
        super('TinyTown');
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

        this.grassLayer = map.createBlankLayer('base-layer', tileSheet, 0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)!;
        this.grassLayer.setScale(this.SCALE);

        this.featureLayer = map.createBlankLayer('features-layer', tileSheet, 0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)!;
        this.featureLayer.setScale(this.SCALE);

        //fill the grass layer with 1 of the three options
        for (let y = 0; y < this.CANVAS_HEIGHT; y++) {
            for (let x = 0; x < this.CANVAS_WIDTH; x++) {
                this.grassLayer.putTileAt(Phaser.Math.Between(0, 2), x, y);
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
        
        const houseGen = new HouseGenerator(() => this);

        // 2. Pass it to the generator you want. House in this case.
        const generatedData: completedSection = houseGen.generate(houseInput);
        
        // 3. Put that somewhere in the feature layer. 1,1 for this example.
        this.featureLayer.putTilesAt(generatedData.grid, 1, 1);
      
        
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
    setSelectionCoordinates(x: number, y: number, w: number, h: number): void {
        const endX = x + w - 1;
        const endY = y + h - 1;

        if (w >= 1 && h >= 1 &&
            x >= 0 && x < this.CANVAS_WIDTH &&
            y >= 0 && y < this.CANVAS_HEIGHT &&
            endX >= 0 && endX < this.CANVAS_WIDTH &&
            endY >= 0 && endY < this.CANVAS_HEIGHT)
        {
            this.isSelecting = true;
            this.selectionStart = new Phaser.Math.Vector2(x, y);

            this.selectionEnd = new Phaser.Math.Vector2(endX, endY);
            this.drawSelectionBox();
            
            this.endSelection();
        } else {
            console.warn(`Invalid selection coordinates provided: x=${x}, y=${y}, w=${w}, h=${h}. Selection not set.`);
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
        console.log('Selected Tiles:', this.selectedTiles);
        
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
        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        const width = endX - startX + 1;
        const height = endY - startY + 1;
        
        // Reset the selectedTiles
        this.selectedTiles = {
          coordinates: [],
          dimensions: { width, height },
          tileGrid: Array(height).fill(0).map(() => Array(width).fill(-1)),
          featureGrid: Array(height).fill(0).map(() => Array(width).fill(-1))
        };
        
        // Populate coordinates and tile IDs
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const worldX = startX + x;
            const worldY = startY + y;
            
            // Add to coordinates array (for compatibility)
            this.selectedTiles.coordinates.push({ x: worldX, y: worldY });
            
            // Get tile IDs from both layers
            if (this.grassLayer) {
              const tile = this.grassLayer.getTileAt(worldX, worldY);
              this.selectedTiles.tileGrid[y][x] = tile ? tile.index : -1;
            }
            
            if (this.featureLayer) {
              const featureTile = this.featureLayer.getTileAt(worldX, worldY);
              this.selectedTiles.featureGrid[y][x] = featureTile ? featureTile.index : -1;
            }
          }
        }
    }

    clearSelection(){
        this.isSelecting = false;
        this.selectionBox.clear();
        this.selectionStart = new Phaser.Math.Vector2(0, 0);
        this.selectionEnd = new Phaser.Math.Vector2(0, 0);
        this.selectedTiles = {
            coordinates: [],
            dimensions: { width: 0, height: 0 },
            tileGrid: [],
            featureGrid: []
        };
        console.log('Selection cleared');
    }

    getSelection(): generatorInput {
        return {
          grid: this.selectedTiles.featureGrid.map(row => [...row]),
          width: this.selectedTiles.dimensions.width,
          height: this.selectedTiles.dimensions.height,
        };
    }

    putFeatureAtSelection(generatedData : completedSection){
        let x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        let y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        this.featureLayer?.putTilesAt(generatedData.grid, x,y);
    }
}

export function createGame(attachPoint: HTMLDivElement) {
    const config = {
        type: Phaser.AUTO,
        width: 640,
        height: 400,
        parent: attachPoint,
        scene: [TinyTownScene]
    };

    return new Phaser.Game(config);
}