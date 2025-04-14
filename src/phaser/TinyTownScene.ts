import Phaser from 'phaser';

import { houseGenerator } from "./featureGenerators/houseGenerator";
import { completedSection, generatorInput } from "./featureGenerators/GeneratorInterface.ts";

class TinyTownScene extends Phaser.Scene {
    private readonly SCALE = 1;
    private readonly CANVAS_WIDTH = 40;
    private readonly CANVAS_HEIGHT = 25;

    private tilemap!: Phaser.Tilemaps.Tilemap;
    private featureLayer!: Phaser.Tilemaps.TilemapLayer;
    private grassLayer!: Phaser.Tilemaps.TilemapLayer;
    private selectionRect!: Phaser.GameObjects.Graphics;


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
        // Create tilemap and layers
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

        this.tilemap = map;
        this.featureLayer = featureLayer;
        this.grassLayer = grassLayer;

        // Fill grass layer with random tiles
        for (let y = 0; y < this.CANVAS_HEIGHT; y++) {
            for (let x = 0; x < this.CANVAS_WIDTH; x++) {
                grassLayer.putTileAt(Phaser.Math.Between(0, 2), x, y);
            }
        }

        // Feature generator demo
        const houseInput: generatorInput = {
            grid: new Array(5).fill(-1).map(() => new Array(5).fill(-1)),
            width: 5,
            height: 5
        };
        const generatedData: completedSection = houseGenerator.generate(houseInput);
        featureLayer.putTilesAt(generatedData.grid, 1, 1);

        // === Selection Box Setup ===

        let isDragging = false;
        let startPoint = new Phaser.Math.Vector2();
        this.selectionRect = this.add.graphics();
        this.selectionRect.lineStyle(3, 0xff0000, 1);
        this.selectionRect.setDepth(10);

        // Safe helper functions to ensure no null values
        const safeWorldToTileX = (worldX: number) => this.tilemap.worldToTileX(worldX) ?? 0;
        const safeWorldToTileY = (worldY: number) => this.tilemap.worldToTileY(worldY) ?? 0;
        const safeTileToWorldX = (tileX: number) => this.tilemap.tileToWorldX(tileX) ?? 0;
        const safeTileToWorldY = (tileY: number) => this.tilemap.tileToWorldY(tileY) ?? 0;

        // Pointer down: start selection
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            isDragging = true;
            startPoint.set(pointer.worldX, pointer.worldY);
            this.selectionRect.clear();
            this.selectionRect.lineStyle(3, 0xff0000, 1);
        });

        // Pointer move: update selection box
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!isDragging) return;

            // Snap to tile grid
            const pointerTileX = safeTileToWorldX(safeWorldToTileX(pointer.worldX));
            const pointerTileY = safeTileToWorldY(safeWorldToTileY(pointer.worldY));
            const startTileX = safeTileToWorldX(safeWorldToTileX(startPoint.x));
            const startTileY = safeTileToWorldY(safeWorldToTileY(startPoint.y));

            const x = Math.min(startTileX, pointerTileX);
            const y = Math.min(startTileY, pointerTileY);
            const width = Math.abs(pointerTileX - startTileX) + this.tilemap.tileWidth;
            const height = Math.abs(pointerTileY - startTileY) + this.tilemap.tileHeight;

            this.selectionRect.clear();
            this.selectionRect.lineStyle(3, 0xff0000, 1);
            this.selectionRect.fillStyle(0xff0000, 0.1);
            this.selectionRect.fillRect(x, y, width, height);

            const dashSize = 4;
            this.drawDottedRect(this.selectionRect, x, y, width, height, dashSize);
        });

        // Pointer up: finalize selection
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            isDragging = false;
        
            const endTileX = safeWorldToTileX(pointer.worldX);
            const endTileY = safeWorldToTileY(pointer.worldY);
            const startTileX = safeWorldToTileX(startPoint.x);
            const startTileY = safeWorldToTileY(startPoint.y);
        
            const tileStartX = Math.min(startTileX, endTileX);
            const tileStartY = Math.min(startTileY, endTileY);
            const tileEndX = Math.max(startTileX, endTileX);
            const tileEndY = Math.max(startTileY, endTileY);
        
            const selectedFeatureIndexes: number[] = [];
            const selectedGrassIndexes: number[] = [];
        
            for (let ty = tileStartY; ty <= tileEndY; ty++) {
                for (let tx = tileStartX; tx <= tileEndX; tx++) {
                    const featureTile = this.featureLayer.getTileAt(tx, ty);
                    if (featureTile && featureTile.index != null) {
                        selectedFeatureIndexes.push(featureTile.index);
                    } else {
                        const grassTile = this.grassLayer.getTileAt(tx, ty);
                        if (grassTile && grassTile.index != null) {
                            selectedGrassIndexes.push(grassTile.index);
                        }
                    }
                }
            }
        
            // Decision: prioritize features if they exist
            if (selectedFeatureIndexes.length > 0) {
                console.log('Selected Feature Tile Indexes:', selectedFeatureIndexes);
            } else {
                console.log('Selected Grass Tile Indexes:', selectedGrassIndexes);
            }
        });
        
    }

    // Helper function to draw dotted rectangle
    private drawDottedRect(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, dashSize: number) {
        const drawDottedLine = (x1: number, y1: number, x2: number, y2: number) => {
            const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
            const dashCount = Math.floor(length / dashSize);

            for (let i = 0; i < dashCount; i += 2) {
                const t1 = i / dashCount;
                const t2 = Math.min((i + 1) / dashCount, 1);

                const startX = Phaser.Math.Linear(x1, x2, t1);
                const startY = Phaser.Math.Linear(y1, y2, t1);
                const endX = Phaser.Math.Linear(x1, x2, t2);
                const endY = Phaser.Math.Linear(y1, y2, t2);

                graphics.moveTo(startX, startY);
                graphics.lineTo(endX, endY);
            }

            graphics.strokePath();
        };

        drawDottedLine(x, y, x + width, y); // Top
        drawDottedLine(x + width, y, x + width, y + height); // Right
        drawDottedLine(x + width, y + height, x, y + height); // Bottom
        drawDottedLine(x, y + height, x, y); // Left
    }

    // Clear Selection function
    public clearSelection(): void {
        if (this.selectionRect) {
            this.selectionRect.clear();
        }
        console.log('Selection cleared');
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