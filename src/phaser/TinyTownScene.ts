import Phaser from 'phaser';

import {HouseGenerator} from "./featureGenerators/houseGenerator";
import {completedSection, generatorInput} from "./featureGenerators/GeneratorInterface.ts";

export class TinyTownScene extends Phaser.Scene {
    private readonly SCALE = 1;
    public readonly CANVAS_WIDTH = 40;  //Size in tiles
    public readonly CANVAS_HEIGHT = 25; // ^^^
    
    ////DEBUG / FEATURE FLAGS////
    private readonly allowOverwriting: boolean = false; // Allows LLM to overwrite placed tiles

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


    putFeatureAtSelection(generatedData: completedSection) {
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
      
        this.putFeatureAt(x, y, generatedData);
        this.clearSelection();
    }
      
    public putFeatureAt(x: number, y: number, feature: completedSection) {
        console.log(`[putFeatureAt] feature='${feature.name}', type='${feature.type}', origin=(${x},${y})`);
        const layer = this.featureLayer!;
        
        // Step 1: Create a simple lookup table for tree structures
        const treeStructures = [
            // Single trees
            { baseIds: [3, 4], pattern: [{dx: 0, dy: 0}, {dx: 0, dy: 1}] }, // Top tile connects to bottom tile
            
            // 2x2 trees
            { baseIds: [6, 9], pattern: [{dx: 0, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: 1, dy: 1}] },
            
            // Cross trees
            { baseIds: [7, 10], pattern: [{dx: 0, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 1}, {dx: 1, dy: 1}, {dx: 0, dy: 2}] }
        ];
        
        // Step 2: First, identify tiles we need to remove
        const tilesToClear = new Set<string>();
        
        // Add all positions where the new feature will have tiles
        for (let ry = 0; ry < feature.grid.length; ry++) {
            for (let rx = 0; rx < feature.grid[ry].length; rx++) {
                if (feature.grid[ry][rx] !== -1) {
                    const wx = x + rx;
                    const wy = y + ry;
                    tilesToClear.add(`${wx},${wy}`);
                }
            }
        }
        
        // Step 3: Now look at existing tiles at those positions
        // If we find a tree pattern, clear the entire tree
        const processedPositions = new Set<string>();
        
        // Make a copy of the positions to clear
        const initialPositions = [...tilesToClear];
        
        // Check each position for tree structures
        for (const posKey of initialPositions) {
            // Skip if we've already processed this position
            if (processedPositions.has(posKey)) continue;
            processedPositions.add(posKey);
            
            const [wx, wy] = posKey.split(',').map(Number);
            const tile = layer.getTileAt(wx, wy);
            if (!tile) continue;
            
            const tileId = tile.index;
            
            // Check if this is a tree base tile
            for (const structure of treeStructures) {
                if (structure.baseIds.includes(tileId)) {
                    // Found a tree structure, add all of its positions to clear
                    for (const offset of structure.pattern) {
                        const treeX = wx + offset.dx;
                        const treeY = wy + offset.dy;
                        tilesToClear.add(`${treeX},${treeY}`);
                    }
                    break;
                }
                
                // Also check if this is any part of the tree (not just the base)
                // For each offset in the pattern, check if this tile could be that part
                for (const offset of structure.pattern) {
                    if (offset.dx === 0 && offset.dy === 0) continue; // Skip the base position
                    
                    // Calculate where the base would be if this is part of the structure
                    const baseX = wx - offset.dx;
                    const baseY = wy - offset.dy;
                    
                    const baseTile = layer.getTileAt(baseX, baseY);
                    if (baseTile && structure.baseIds.includes(baseTile.index)) {
                        // Found a tree where this is a part, add all positions
                        for (const partOffset of structure.pattern) {
                            const treeX = baseX + partOffset.dx;
                            const treeY = baseY + partOffset.dy;
                            tilesToClear.add(`${treeX},${treeY}`);
                        }
                        break;
                    }
                }
            }
        }
        
        // Step 4: Clear all the tiles
        console.log(`[putFeatureAt] Clearing ${tilesToClear.size} tiles`);
        for (const posKey of tilesToClear) {
            const [cx, cy] = posKey.split(',').map(Number);
            layer.removeTileAt(cx, cy);
        }
        
        // Step 5: Place the new feature
        for (let ry = 0; ry < feature.grid.length; ry++) {
            for (let rx = 0; rx < feature.grid[ry].length; rx++) {
                const tileVal = feature.grid[ry][rx];
                if (tileVal !== -1) {
                    layer.putTileAt(tileVal, x + rx, y + ry);
                }
            }
        }
    }

    // private getReplacementRules() {
    //     return {
    //         forest: { 
    //             ids: [3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 21, 22, 23, 27, 28, 29, 30, 31, 32, 33, 34, 35], 
    //             canReplace: [-1, 0, 1, 2, 27, 28, 29, 57, 94, 95, 106, 107, 130, 131] // Can replace empty, grass or decor
    //         },
    //         fence: { 
    //             ids: [44, 45, 46, 56, 58, 68, 69, 70], 
    //             canReplace: [-1, 0, 1, 2, 27, 28, 29, 57, 94, 95, 106, 107, 130, 131,
    //                          3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35] 
    //             // Can replace empty, grass, decor, or forest
    //         },
    //         house: { 
    //             ids: [48, 49, 50, 51, 52, 53, 54, 55, 60, 61, 62, 63, 64, 65, 66, 67, 
    //                   72, 73, 74, 75, 76, 77, 78, 79, 84, 85, 86, 87, 88, 89, 90, 91], 
    //             canReplace: [-1, 0, 1, 2, 27, 28, 29, 57, 94, 95, 106, 107, 130, 131,
    //                          3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35] 
    //             // Can replace empty, grass, decor, or forest
    //         },
    //         decor: { 
    //             ids: [27, 28, 29, 57, 94, 95, 106, 107, 130, 131], 
    //             canReplace: [-1, 0, 1, 2] // Can replace empty or grass only
    //         },
    //     };
    // }

    /**
     * Clears all tiles on the feature layer within the current selection
     */
    public clearFeatureLayerInSelection(): void {    

        if (!this.featureLayer) {
            console.warn('Feature layer not available');
            return;
        }
        
        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const tile = this.featureLayer.getTileAt(x, y);
            if (tile) {
            this.featureLayer.removeTileAt(x, y);
            }
        }
        }
        
        console.log(`Cleared all tiles in selection`);
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