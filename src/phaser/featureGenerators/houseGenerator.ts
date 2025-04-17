import { FeatureGenerator, completedSection, generatorInput } from './GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';

const MIN_HOUSE_WIDTH = 3;
const MIN_HOUSE_HEIGHT = 3;
const BORDER_PADDING = 1;

const HOUSE_TILES = {
  // Roofs
  48: 'grey roof tile',
  49: 'grey roof tile',
  50: 'grey roof tile',
  51: 'grey roof chimney',
  60: 'grey roof tile',
  61: 'grey roof tile',
  62: 'grey roof tile',
  63: 'grey roof pointed',
  52: 'red roof left edge',
  53: 'red roof middle',
  54: 'red roof right edge',
  55: 'red roof chimney',
  64: 'red roof bottom left',
  65: 'red roof bottom middle',
  66: 'red roof bottom right',
  67: 'red roof pointed',

  // Brown house
  72: 'brown house left wall',
  73: 'brown house middle wall',
  74: 'brown house entrance',
  75: 'brown house right wall',
  84: 'brown house window',
  85: 'brown house single door',
  86: 'brown house double door left',
  87: 'brown house double door right',

  // Grey house
  76: 'grey house left wall',
  77: 'grey house middle wall',
  78: 'grey house entrance',
  79: 'grey house right wall',
  88: 'grey house window',
  89: 'grey house single door',
  90: 'grey house double door left',
  91: 'grey house double door right',
};

let points_of_interest = new Map();

export class HouseGenerator implements FeatureGenerator {
  sceneGetter: () => TinyTownScene;

  constructor(sceneGetter: () => TinyTownScene) {
    this.sceneGetter = sceneGetter;
  }

  static houseArgsSchema = z.object({
    style: z.enum(["brown", "grey"]).optional(),
    width: z.number().min(3).max(20).optional(),
    height: z.number().min(3).max(20).optional(),
    roof: z.enum(["red", "grey"]).optional(),
    doorCount: z.number().min(1).max(4).optional(),
    windowCount: z.number().min(0).max(20).optional(),
  });

  toolCall = tool(
    async (args: z.infer<typeof HouseGenerator.houseArgsSchema>) => {
      console.log('Generating house with args:', args);
      const scene = this.sceneGetter();
      if (!scene) return "Tool Failed: No reference to scene.";
      const selection = scene.getSelection();
      scene.putFeatureAtSelection(this.generate(selection, args));
      return "House added.";
    },
    {
      name: "house",
      schema: HouseGenerator.houseArgsSchema,
      description: "Adds a house to the map. Supports style, roof, width, height, door count, and window count.",
    }
  );

  generate(mapSection: generatorInput, args?: z.infer<typeof HouseGenerator.houseArgsSchema>): completedSection {
    const grid = mapSection.grid;

    const houseWidth = args?.width ?? Phaser.Math.Between(MIN_HOUSE_WIDTH, mapSection.width - BORDER_PADDING * 2);
    const houseHeight = args?.height ?? Phaser.Math.Between(MIN_HOUSE_HEIGHT, mapSection.height - BORDER_PADDING * 2);
    const houseX = Phaser.Math.Between(BORDER_PADDING, mapSection.width - houseWidth - BORDER_PADDING);
    const houseY = Phaser.Math.Between(BORDER_PADDING, mapSection.height - houseHeight - BORDER_PADDING);

    // Determine style
    let wallTextureOffset: -4 | 0 = Math.random() < 0.5 ? -4 : 0;
    if (args?.style === 'brown') wallTextureOffset = -4;
    if (args?.style === 'grey') wallTextureOffset = 0;

    // Determine roof based on style
    let isRedRoof: boolean;
    if (args?.roof) {
      isRedRoof = args.roof === 'red';
    } else {
      // Default rule: brown house -> grey roof, grey house -> red roof
      isRedRoof = wallTextureOffset === 0;
    }

    const roofTextureOffset = isRedRoof ? 0 : -4;

    const chimneyX = Phaser.Math.Between(-1, houseWidth - 1);

    // --- Roofs ---
    let y = houseY;
    grid[y][houseX] = 52 + roofTextureOffset;
    grid[y].fill(53 + roofTextureOffset, houseX + 1, houseX + houseWidth - 1);
    grid[y][houseX + houseWidth - 1] = 54 + roofTextureOffset;
    if (chimneyX >= 0) grid[y][houseX + chimneyX] = 55 + roofTextureOffset;

    y = houseY + 1;
    grid[y][houseX] = 64 + roofTextureOffset;
    grid[y].fill(65 + roofTextureOffset, houseX + 1, houseX + houseWidth - 1);
    grid[y][houseX + houseWidth - 1] = 66 + roofTextureOffset;

    // --- Wall + Window Logic ---
    const windowCount = args?.windowCount ?? 0;
    const wallTiles: { x: number, y: number }[] = [];

    for (y = houseY + 2; y < houseY + houseHeight; y++) {
      grid[y][houseX] = 76 + wallTextureOffset;
      grid[y][houseX + houseWidth - 1] = 79 + wallTextureOffset;

      for (let x = houseX + 1; x < houseX + houseWidth - 1; x++) {
        wallTiles.push({ x, y });
      }
    }

    const shuffledWallTiles = Phaser.Utils.Array.Shuffle(wallTiles);
    const windowTiles = shuffledWallTiles.slice(0, windowCount);

    for (const { x, y } of wallTiles) {
      const isWindow = windowTiles.some(tile => tile.x === x && tile.y === y);
      grid[y][x] = isWindow ? 88 + wallTextureOffset : 77 + wallTextureOffset;
    }

    // --- Door + Awning ---
    const doorCount = args?.doorCount ?? 1;
    const possibleDoorXPositions = [];
    for (let x = houseX + 1; x < houseX + houseWidth - 1; x++) {
      possibleDoorXPositions.push(x);
    }

    const shuffledDoors = Phaser.Utils.Array.Shuffle(possibleDoorXPositions).slice(0, doorCount);

    shuffledDoors.forEach((doorX, index) => {
      grid[houseY + houseHeight - 1][doorX] = 89 + wallTextureOffset;

      const awningY = houseY + 1;
      if (![77 + wallTextureOffset, 79 + wallTextureOffset].includes(grid[awningY][doorX])) {
        grid[awningY][doorX] = 67 + roofTextureOffset;
      }

      points_of_interest.set(`door${index + 1}`, { x: doorX, y: houseY + houseHeight - 1 });
    });

    return {
      name: 'House',
      description: `${args?.style ?? 'A'} house with a ${isRedRoof ? 'red' : 'grey'} roof, ${doorCount} door(s), and ${windowCount} window(s)`,
      grid,
      points_of_interest,
    };
  }
}
