import Phaser from 'phaser';

import {Preload} from './Preload';
import {HouseGenerator} from "./featureGenerators/houseGenerator";
import {completedSection, generatorInput} from "./featureGenerators/GeneratorInterface.ts";

interface TinyTownSceneData {
    dict: { [key: number]: string };
}

export class TinyTownScene extends Phaser.Scene {
    private readonly SCALE = 1;
    public readonly CANVAS_WIDTH = 40;  //Size in tiles
    public readonly CANVAS_HEIGHT = 25; // ^^^
    
    ////DEBUG / FEATURE FLAGS////
    private readonly allowOverwriting: boolean = false; // Allows LLM to overwrite placed tiles
    

    // selection box properties
    private selectionBox!: Phaser.GameObjects.Graphics;
    public selectionStart!: Phaser.Math.Vector2;
    public selectionEnd!: Phaser.Math.Vector2;
    private isSelecting: boolean = false;
    private selectedTiles: {
        coordinates: { x: number; y: number }[];  
        dimensions: { width: number; height: number };
        tileGrid: number[][];  // grass layer
        featureGrid: number[][]; // feature layer
        combinedGrid: number[][]; // combined layer
      } = {
        coordinates: [],
        dimensions: { width: 0, height: 0 },
        tileGrid: [],
        featureGrid: [],
        combinedGrid: []
      };    
    private grassLayer : Phaser.Tilemaps.TilemapLayer | null = null;
    private featureLayer : Phaser.Tilemaps.TilemapLayer | null = null;

    // set of tile indexes used for tile understanding
    private selectedTileSet = new Set<number>();
    public tileDictionary!: { [key: number]: string };

    public LastData: completedSection = {
        name: 'DefaultSelection',
        description: 'Full Default',
        grid: [],
        points_of_interest: new Map(),
    };

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
        
        // loop through selectedTileSet once it works
        const selectedDescriptions = [];
        for (let tileID of this.selectedTileSet) {
            const description = this.tileDictionary[tileID];
            selectedDescriptions.push({ tileID, description });
        }
        // selectedDescriptions is all the unique tiles and their descriptions
        console.log(selectedDescriptions);
    }
    
    drawSelectionBox() {
        this.selectionBox.clear();

        if (!this.isSelecting) return;

        // Calculate the bounds of the selection
        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);

        const width = endX - startX + 1;
        const height = endY - startY + 1;

        
        // Draw a semi-transparent rectangle
        this.selectionBox.fillStyle(0xFF5555, 0.3);
        this.selectionBox.fillRect(
            startX * 16 * this.SCALE, 
            startY * 16 * this.SCALE, 
            (endX - startX + 1) * 16 * this.SCALE, 
            (endY - startY + 1) * 16 * this.SCALE
        );

        // Draw a dashed border
        this.selectionBox.lineStyle(2, 0xFF5555, 1);
        this.selectionBox.beginPath();
        const dashLength = 8; // Length of each dash
        const gapLength = 4;  // Length of each gap

        // Top border
        for (let i = 0; i < width * 16 * this.SCALE; i += dashLength + gapLength) {
            this.selectionBox.moveTo(startX * 16 * this.SCALE + i, startY * 16 * this.SCALE);
            this.selectionBox.lineTo(
                Math.min(startX * 16 * this.SCALE + i + dashLength, endX * 16 * this.SCALE + 16 * this.SCALE),
                startY * 16 * this.SCALE
            );
        }

        // Bottom border
        for (let i = 0; i < width * 16 * this.SCALE; i += dashLength + gapLength) {
            this.selectionBox.moveTo(startX * 16 * this.SCALE + i, endY * 16 * this.SCALE + 16 * this.SCALE);
            this.selectionBox.lineTo(
                Math.min(startX * 16 * this.SCALE + i + dashLength, endX * 16 * this.SCALE + 16 * this.SCALE),
                endY * 16 * this.SCALE + 16 * this.SCALE
            );
        }

        // Left border
        for (let i = 0; i < height * 16 * this.SCALE; i += dashLength + gapLength) {
            this.selectionBox.moveTo(startX * 16 * this.SCALE, startY * 16 * this.SCALE + i);
            this.selectionBox.lineTo(
                startX * 16 * this.SCALE,
                Math.min(startY * 16 * this.SCALE + i + dashLength, endY * 16 * this.SCALE + 16 * this.SCALE)
            );
        }

        // Right border
        for (let i = 0; i < height * 16 * this.SCALE; i += dashLength + gapLength) {
            this.selectionBox.moveTo(endX * 16 * this.SCALE + 16 * this.SCALE, startY * 16 * this.SCALE + i);
            this.selectionBox.lineTo(
                endX * 16 * this.SCALE + 16 * this.SCALE,
                Math.min(startY * 16 * this.SCALE + i + dashLength, endY * 16 * this.SCALE + 16 * this.SCALE)
            );
        }

        this.selectionBox.strokePath();
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
          featureGrid: Array(height).fill(0).map(() => Array(width).fill(-1)),
          combinedGrid: Array(height).fill(0).map(() => Array(width).fill(-1))
        };
        
        // Populate coordinates and tile IDs
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const worldX = startX + x;
            const worldY = startY + y;
            
            // Add to coordinates array 
            this.selectedTiles.coordinates.push({ x: worldX, y: worldY });
            
            // Get tile IDs from both layers
            let grassTileId = -1;
            if (this.grassLayer) {
              const tile = this.grassLayer.getTileAt(worldX, worldY);
              grassTileId = tile ? tile.index : -1;
              this.selectedTiles.tileGrid[y][x] = grassTileId;
            }
            
            let featureTileId = -1;
            if (this.featureLayer) {
              const featureTile = this.featureLayer.getTileAt(worldX, worldY);
              featureTileId = featureTile ? featureTile.index : -1;
              this.selectedTiles.featureGrid[y][x] = featureTileId;
            }

            this.selectedTiles.combinedGrid[y][x] = (featureTileId !== -1) ? featureTileId : grassTileId;

            // create a set of unique tile ID to grab information from the tile dictionary
            this.selectedTileSet.add((featureTileId !== -1) ? featureTileId : grassTileId);
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
            featureGrid: [],
            combinedGrid: []
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

    putFeatureAtSelection(generatedData : completedSection, worldOverride = false, acceptneg = false){
        console.group("putFeatureAtSelection")
        console.log("generatedData");
        console.log(generatedData);
        let x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        let y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        if(worldOverride)
        {
            x = 0;
            y = 0;
        }
        this.LastData = structuredClone(generatedData)
        this.LastData.grid = Array(this.CANVAS_HEIGHT).fill(0).map(() => Array(this.CANVAS_WIDTH).fill(-1));
        var tempGrid = this.featureLayer?.getTilesWithin(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        console.log("tempGrid");
        console.log(tempGrid);
        for (var tile of tempGrid || []){
            if (tile.index != -1){
                this.LastData.grid[tile.y][tile.x] = tile.index;
            }
        }
        console.log("this.LastData");
        console.log(this.LastData);
        if(this.allowOverwriting){
            this.featureLayer?.putTilesAt(generatedData.grid, x,y);
        }else{
            for (let row = 0; row < generatedData.grid.length; row++) {
                for (let col = 0; col < generatedData.grid[row].length; col++) {
                    const tileValue = generatedData.grid[row][col];
                    if (acceptneg) {
                        this.featureLayer?.putTileAt(tileValue,x + col, y + row);
                    }
                    else if (tileValue !== -1) {
                        if(tileValue == -2){
                            this.featureLayer?.putTileAt(-1,x + col, y + row);
                            continue;
                        }
                        const currentTile = this.featureLayer?.getTileAt(x + col, y + row);
                        if (!currentTile || currentTile.index === -1) {
                            this.featureLayer?.putTileAt(tileValue, x + col, y + row);
                        }
                    }
                }
            }
        }
        console.groupEnd()
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