import { FeatureGenerator, completedSection, generatorInput } from "./GeneratorInterface";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from "../TinyTownScene";

const MIN_HOUSE_WIDTH = 3;
const MIN_HOUSE_HEIGHT = 3;
const BORDER_PADDING = 1;

const HOUSE_TILES: Record<number, string> = {
  48: "grey roof top-left",
  49: "grey roof top-middle",
  50: "grey roof top-right",
  51: "grey roof chimney",
  60: "grey roof bottom-left",
  61: "grey roof bottom-middle",
  62: "grey roof bottom-right",
  63: "grey roof pointed",

  52: "red roof top-left",
  53: "red roof top-middle",
  54: "red roof top-right",
  55: "red roof chimney",
  64: "red roof bottom-left",
  65: "red roof bottom-middle",
  66: "red roof bottom-right",
  67: "red roof pointed",

  72: "brown wall left",
  73: "brown wall middle",
  74: "brown entrance (no door)",
  75: "brown wall right",
  84: "brown window",
  85: "brown single door",
  86: "brown double door left",
  87: "brown double door right",

  76: "grey wall left",
  77: "grey wall middle",
  78: "grey entrance (no door)",
  79: "grey wall right",
  88: "grey window",
  89: "grey single door",
  90: "grey double door left",
  91: "grey double door right",
};

let points_of_interest = new Map<string, { x: number; y: number }>();

export class HouseGenerator implements FeatureGenerator {
  sceneGetter: () => TinyTownScene;

  constructor(sceneGetter: () => TinyTownScene) {
    this.sceneGetter = sceneGetter;
  }

  static houseArgsSchema = z.object({
    style: z.enum(["brown", "grey"]).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().min(MIN_HOUSE_WIDTH).max(50).optional(),
    height: z.number().min(MIN_HOUSE_HEIGHT).max(50).optional(),
    roof: z.enum(["red", "grey"]).optional(),
    doorCount: z.number().min(1).max(4).optional(),
    windowCount: z.number().min(0).max(20).optional(),
  });

  toolCall = tool(
    async (args: z.infer<typeof HouseGenerator.houseArgsSchema>) => {
      console.log("HouseGenerator: Received args:", args);

      const scene = this.sceneGetter();
      if (!scene) {
        console.error("HouseGenerator: sceneGetter returned null");
        return "Error: Tool failed—no reference to the scene.";
      }

      const selection = scene.getSelection();
      if (!selection || selection.width <= 0 || selection.height <= 0) {
        console.warn("HouseGenerator: No valid selection");
        return "Error: No valid selection to place a house in.";
      }

      try {
        const completed = this.generate(selection, args);

        scene.putFeatureAtSelection(completed);

        const cpX = lastHouseX + Math.floor(lastHouseWidth / 2);
        const cpY = lastHouseY + lastHouseHeight;
        return `House added at (${lastHouseX}, ${lastHouseY}). Connection point at (${cpX}, ${cpY}).`;
      } catch (e) {
        console.error("HouseGenerator: generation failed:", e);
        const msg = e instanceof Error ? e.message : "Unknown error during house generation.";
        if (msg.startsWith("Error:")) return msg;
        return `Error: ${msg}`;
      }
    },
    {
      name: "house",
      schema: HouseGenerator.houseArgsSchema,
      description:
        "Adds a rectangular house into the current selection.  \n" +
        "- Optional parameters: `style` ('brown' or 'grey'), `roof` ('red' or 'grey'),  \n" +
        "  `width` (≥ 3), `height` (≥ 3), `doorCount` (1–4), `windowCount` (0–20), and `x,y` (local coordinates).  \n" +
        "- If any dimension would exceed the selection’s available area (after 1‐tile padding), it will be clamped automatically.  \n" +
        "- If the selection is too small for even a 3×3 house, you will get an error message.  \n" +
        "Returns a simple string: either `Error: …` or `House added at (x,y)…`."
    }
  );

 
  generate(
    mapSection: generatorInput,
    args: z.infer<typeof HouseGenerator.houseArgsSchema> = {}
  ): completedSection {
    const width  = mapSection.width;
    const height = mapSection.height;
    const original = mapSection.grid;
    if (
      !Array.isArray(original) ||
      original.length !== height ||
      original.some((row) => !Array.isArray(row) || row.length !== width)
    ) {
      throw new Error(
        `Error: Expected a ${height}×${width} grid, but dimensions mismatched.`
      );
    }

    const usableWidth  = width  - BORDER_PADDING * 2;
    const usableHeight = height - BORDER_PADDING * 2;

    if (usableWidth < MIN_HOUSE_WIDTH || usableHeight < MIN_HOUSE_HEIGHT) {
      throw new Error(
        `Error: Selection is too small.  Usable area = ${usableWidth}×${usableHeight}, but minimum house size is ${MIN_HOUSE_WIDTH}×${MIN_HOUSE_HEIGHT}.`
      );
    }

    let houseWidth  = args.width  !== undefined ? args.width  : Phaser.Math.Between(MIN_HOUSE_WIDTH, usableWidth);
    let houseHeight = args.height !== undefined ? args.height : Phaser.Math.Between(MIN_HOUSE_HEIGHT, usableHeight);

    if (houseWidth > usableWidth) {
      console.warn(
        `HouseGenerator: requested width ${houseWidth} > usable ${usableWidth}, clamping.`
      );
      houseWidth = usableWidth;
    }
    if (houseHeight > usableHeight) {
      console.warn(
        `HouseGenerator: requested height ${houseHeight} > usable ${usableHeight}, clamping.`
      );
      houseHeight = usableHeight;
    }

    let houseX = args.x !== undefined
      ? args.x
      : Phaser.Math.Between(BORDER_PADDING, width - BORDER_PADDING - houseWidth);
    let houseY = args.y !== undefined
      ? args.y
      : Phaser.Math.Between(BORDER_PADDING, height - BORDER_PADDING - houseHeight);

    if (houseX < BORDER_PADDING) houseX = BORDER_PADDING;
    if (houseY < BORDER_PADDING) houseY = BORDER_PADDING;
    if (houseX + houseWidth > width - BORDER_PADDING) {
      houseX = width - BORDER_PADDING - houseWidth;
    }
    if (houseY + houseHeight > height - BORDER_PADDING) {
      houseY = height - BORDER_PADDING - houseHeight;
    }

    lastHouseX = houseX;
    lastHouseY = houseY;
    lastHouseWidth = houseWidth;
    lastHouseHeight = houseHeight;

    let wallTextureOffset: -4 | 0 = Math.random() < 0.5 ? -4 : 0;
    if (args.style === "brown") wallTextureOffset = -4;
    if (args.style === "grey")  wallTextureOffset = 0;

    let isRedRoof: boolean;
    if (args.roof) {
      isRedRoof = args.roof === "red";
    } else {
      isRedRoof = wallTextureOffset === 0;
    }
    const roofTextureOffset = isRedRoof ? 0 : -4;

    const newGrid: number[][] = original.map((row) => row.slice());

    {
      const yy = houseY;
      newGrid[yy][houseX] = 52 + roofTextureOffset; 
      newGrid[yy].fill(53 + roofTextureOffset, houseX + 1, houseX + houseWidth - 1);
      newGrid[yy][houseX + houseWidth - 1] = 54 + roofTextureOffset; 

      const chimneyX = Phaser.Math.Between(0, houseWidth - 1);
      if (chimneyX >= 0) {
        newGrid[yy][houseX + chimneyX] = 55 + roofTextureOffset; 
      }
    }
    {
      const yy = houseY + 1;
      newGrid[yy][houseX] = 64 + roofTextureOffset; 
      newGrid[yy].fill(65 + roofTextureOffset, houseX + 1, houseX + houseWidth - 1);
      newGrid[yy][houseX + houseWidth - 1] = 66 + roofTextureOffset; 
    }

    const windowCount = args.windowCount ?? 0;
    const wallPositions: { x: number; y: number }[] = [];
    for (let yy = houseY + 2; yy < houseY + houseHeight; yy++) {
      newGrid[yy][houseX] = 76 + wallTextureOffset;
      newGrid[yy][houseX + houseWidth - 1] = 79 + wallTextureOffset;

      for (let xx = houseX + 1; xx < houseX + houseWidth - 1; xx++) {
        wallPositions.push({ x: xx, y: yy });
      }
    }
    const shuffledWalls = Phaser.Utils.Array.Shuffle(wallPositions);
    const chosenWindowSpots = shuffledWalls.slice(0, windowCount);
    for (const { x: winX, y: winY } of wallPositions) {
      const isWindow = chosenWindowSpots.some((w) => w.x === winX && w.y === winY);
      newGrid[winY][winX] = isWindow
        ? 88 + wallTextureOffset 
        : 77 + wallTextureOffset; 
    }

    const doorCount = args.doorCount ?? 1;
    const possibleDoors: number[] = [];
    for (let xx = houseX + 1; xx < houseX + houseWidth - 1; xx++) {
      possibleDoors.push(xx);
    }
    const selectedDoors = Phaser.Utils.Array.Shuffle(possibleDoors).slice(0, doorCount);
    for (let i = 0; i < selectedDoors.length; i++) {
      const dx = selectedDoors[i];
      const dy = houseY + houseHeight - 1;
      newGrid[dy][dx] = 89 + wallTextureOffset;

      const awningRow = houseY + 1;
      if (
        ![77 + wallTextureOffset, 79 + wallTextureOffset].includes(newGrid[awningRow][dx])
      ) {
        newGrid[awningRow][dx] = 67 + roofTextureOffset; 
      }

      points_of_interest.set(`door${i + 1}`, { x: dx, y: dy });
    }

    return {
      name: "House",
      description: `${args.style ?? "A"} house (${houseWidth}×${houseHeight}) with a ${
        isRedRoof ? "red" : "grey"
      } roof, ${doorCount} door(s), and ${windowCount} window(s).`,
      grid: newGrid,
      points_of_interest,
    };
  }
}

let lastHouseX = 0;
let lastHouseY = 0;
let lastHouseWidth = 0;
let lastHouseHeight = 0;
