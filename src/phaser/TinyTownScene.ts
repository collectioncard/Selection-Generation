import Phaser from 'phaser';

import {Preload} from './Preload';
import {HouseGenerator} from "./featureGenerators/houseGenerator";
import {completedSection, generatorInput} from "./featureGenerators/GeneratorInterface.ts";
import {Tree} from "./TreeStructure.ts"

interface TinyTownSceneData {
    dict: { [key: number]: string };
}

export class TinyTownScene extends Phaser.Scene {
    private highlightBorders: Phaser.GameObjects.Graphics[] = []; 
    private highlightLabels: Phaser.GameObjects.Text[] = [];

    private readonly SCALE = 1;
    public readonly CANVAS_WIDTH = 40;  //Size in tiles
    public readonly CANVAS_HEIGHT = 25; // ^^^
    
    ////DEBUG / FEATURE FLAGS////
    private readonly allowOverwriting: boolean = false; // Allows LLM to overwrite placed tiles
    
    // Phaser map & tileset references
    private map!: Phaser.Tilemaps.Tilemap;
    private tileset!: Phaser.Tilemaps.Tileset;

    // Base layers
    private grassLayer!: Phaser.Tilemaps.TilemapLayer;
    private featureLayer!: Phaser.Tilemaps.TilemapLayer;

    // Tree Structure
    private layerTree = new Tree("Root", [[0, 0], [this.CANVAS_WIDTH, this.CANVAS_HEIGHT]], this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    
    // Named layers storage: name → bounds + tile coordinates
    private namedLayers = new Map<
        string,
        {
            layer: Phaser.Tilemaps.TilemapLayer,
            bounds: { x: number, y: number, width: number, height: number }
        }
    >();

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
            'phaserAssets/Tilemap_Extruded.png',
        );
        
    }

    create() {
        const stripeSize = 64;
        const stripeThickness = 16;

        const g = this.make.graphics();
        g.fillStyle(0x000000, 1);
        g.fillRect(0, 0, stripeSize, stripeSize);

        g.lineStyle(stripeThickness, 0xb92d2e, 1);
        g.strokeLineShape(new Phaser.Geom.Line(0, stripeSize, stripeSize, 0));
        g.generateTexture('stripePattern', stripeSize, stripeSize);
        g.destroy();
        
        const stripes = this.add
        .tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'stripePattern')
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(-100);

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            stripes.setSize(gameSize.width, gameSize.height);
        });

        const map = this.make.tilemap({
            tileWidth: 16,
            tileHeight: 16,
            width: 20,
            height: 20,
        });

        // Load the extruded map to prevent bleeding when zooming in.
        // This is generated with npm run process-assets
        // this must be done for every new tileset
        const tileSheet = map.addTilesetImage("tiny_town_tiles", "tiny_town_tiles", 16, 16, 1, 2)!;

        this.map = map;
        this.tileset = tileSheet;

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
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const x: number = Math.floor(worldPoint.x / (16 * this.SCALE));
        const y: number = Math.floor(worldPoint.y / (16 * this.SCALE));
        
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
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const x: number = Math.floor(worldPoint.x / (16 * this.SCALE));
        const y: number = Math.floor(worldPoint.y / (16 * this.SCALE));
        
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

    public clearLayerHighlights() {
        this.highlightBorders.forEach(g => g.destroy());
        this.highlightLabels.forEach(t => t.destroy());
        this.highlightBorders = [];
        this.highlightLabels  = [];
    }

    public drawLayerHighlights(layerNames: string[]) {
        this.clearLayerHighlights();
      
        const tw = 16 * this.SCALE;
        const th = 16 * this.SCALE;
        const color     = 0x00ff00; // Color
        const alpha     = 0.5;      // opacity
        const lineWidth = 4;        // line width
      
        layerNames.forEach(name => {
            const info = this.namedLayers.get(name);
            if (!info) return;
        
            const { x, y, width, height } = info.bounds;
            const wx  = x * tw;
            const wy  = y * th;
            const wpx = width  * tw;
            const hpx = height * th;
        
            // draw the box
            const g = this.add.graphics().setDepth(150);
            g.lineStyle(lineWidth, color, alpha);
            g.strokeRect(wx, wy, wpx, hpx);
            this.highlightBorders.push(g);
        
            // draw the label in the top-right corner
            const label = this.add
                .text(wx + wpx - 4, wy + 4, name, {
                font: '28px sans-serif',
                color: '#ff0000'
                })
                .setOrigin(1, 0)
                .setDepth(151);
            this.highlightLabels.push(label);
        });
    }

    public nameSelection(name: string) {
        const sx = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const sy = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const ex = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const ey = Math.max(this.selectionStart.y, this.selectionEnd.y);
        const w  = ex - sx + 1;
        const h  = ey - sy + 1;
    
        const layer = this.map.createBlankLayer(
            name,            // unique layer name
            this.tileset,    // your Tileset object
            sx * 16 * this.SCALE,  // world-space X
            sy * 16 * this.SCALE,  // world-space Y
            w,               // layer width in tiles
            h                // layer height in tiles
        );
    
        if (!layer) {
            console.warn(`Failed to create layer "${name}".`);
            return;
        }
    
        // Copy & clear tiles from featureLayer → new layer
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const tx  = sx + col;
                const ty  = sy + row;
                const idx = this.featureLayer.getTileAt(tx, ty)?.index ?? -1;
                if (idx >= 0) {
                layer.putTileAt(idx, col, row);
                this.featureLayer.removeTileAt(tx, ty);
                }
            }
        }
    
        this.namedLayers.set(name, {
            layer,
            bounds: {x: sx, y:sy, width: w, height: h}
        });
        console.log(`Layer "${name}" created at tile coords (${sx},${sy}) size ${w}×${h}`);

        this.layerTree.add(name, [[sx, sy],[ex, ey]], w, h);
        this.layerTree.printTree();
    }

    public selectLayer(name: string) {
        const info = this.namedLayers.get(name);
        if (!info) {
          console.warn(`No layer called "${name}".`);
          return;
        }
        const startX  = info.bounds.x;
        const startY  = info.bounds.y;
        const width   = info.bounds.width;
        const height  = info.bounds.height;
        // this will draw & collect
        this.setSelectionCoordinates(startX, startY, width, height);
        // then zoom in on it
        this.zoomToLayer(name);
        console.log(
            `Re-selected layer "${name}" at tile (${startX},${startY}) ` +
            `size ${width}×${height}.`
        );

        // Used to change highlighted layer in the UI
        window.dispatchEvent(new CustomEvent('layerSelected', { detail: name }));
    }
    

    // //Moves an existing named layer by (dx, dy) tiles.

    // public moveLayer(name: string, dx: number, dy: number) {
    //     const layer = this.namedLayers.get(name);
    //     if (!layer) {
    //         console.warn(`Layer "${name}" not found.`);
    //         return;
    //     }

    //     layer.x += dx * 16 * this.SCALE;
    //     layer.y += dy * 16 * this.SCALE;

    //     console.log(`Layer "${name}" moved by (${dx},${dy}) tiles`);
    // }

    public zoomToLayer(name: string, paddingFraction = 0.1){
        const info = this.namedLayers.get(name);
        if (!info) {
            console.warn(`Layer "${name}" not found, cannot zoom.`);
            return;
        }

        const { x, y, width, height } = info.bounds;
        const cam = this.cameras.main;

        // tile → world pixels
        const tw = 16 * this.SCALE;
        const th = 16 * this.SCALE;
        const worldX = x * tw;
        const worldY = y * th;
        const layerWpx = width * tw;
        const layerHpx = height * th;

        // how much to zoom so that the layer just fits (before padding)
        const zoomX = cam.width  / layerWpx;
        const zoomY = cam.height / layerHpx;
        let zoom = Math.min(zoomX, zoomY);

        // shrink a bit by paddingFraction (e.g. 0.1 → 10% border)
        zoom = zoom * (1 - paddingFraction);

        cam.setZoom(zoom);

        // center on the middle of that layer
        cam.centerOn(
            worldX + layerWpx  / 2,
            worldY + layerHpx  / 2
        );
    }

    public resetView(){
        const cam = this.cameras.main;
        cam.setZoom(1);
        // center on world middle (mapWidth*tileSize/2, mapHeight*tileSize/2)
        const worldW = this.CANVAS_WIDTH * 16 * this.SCALE;
        const worldH = this.CANVAS_HEIGHT * 16 * this.SCALE;
        cam.centerOn(worldW / 2, worldH / 2);
        console.log('View reset to default');
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