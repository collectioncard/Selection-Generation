import { completedSection, FeatureGenerator, generatorInput } from "./GeneratorInterface";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from "../TinyTownScene";

// Default probability to place a decor tile if the user does not supply "chance"
const DECOR_CHANCE = 0.05;


const DECOR_TILES: Record<number, string> = {
  27: "orange tree",
  28: "green tree",
  29: "mushroom",
  57: "wheelbarrow",
  94: "beehive",
  95: "target",
  106: "log",
  107: "bag",
  130: "bucket empty",
  131: "bucket full",
};

export class DecorGenerator implements FeatureGenerator {
  sceneGetter: () => TinyTownScene;

  constructor(sceneGetter: () => TinyTownScene) {
    this.sceneGetter = sceneGetter;
  }

  toolCall = tool(
    async (args: { chance?: number }) => {
      const rawChance = args.chance;
      const chanceToUse =
        rawChance !== undefined && rawChance !== null
          ? rawChance
          : DECOR_CHANCE;

      if (chanceToUse < 0 || chanceToUse > 1) {
        return `Error: Provided \`chance\` of ${chanceToUse} is out of range (must be between 0 and 1).`;
      }

      console.log("DecorGenerator: Adding decor with chance =", chanceToUse);
      let scene = this.sceneGetter();
      if (!scene) {
        console.error("DecorGenerator: sceneGetter returned null");
        return "Error: Tool failed—no reference to the scene.";
      }

      let selection = scene.getSelection();
      if (!selection || selection.width <= 0 || selection.height <= 0) {
        console.warn("DecorGenerator: Empty or invalid selection");
        return "Error: No valid selection to decorate.";
      }

      try {
        const filledSection = this.generate(selection, chanceToUse);

        scene.putFeatureAtSelection(filledSection);
        return `${chanceToUse}`; 
      } catch (e) {
        console.error("DecorGenerator: generation failed:", e);
        const errMsg =
          e instanceof Error ? e.message : "Unknown error during decor generation.";
        return `Error: ${errMsg}`;
      }
    },
    {
      name: "decor",
      schema: z.object({
        chance: z.number().min(0).max(1).optional(),
      }),
      description:
        "Adds random decor items (trees, mushrooms, etc.) to the current selection with a given probability (0 ≤ chance ≤ 1). " +
        "If you omit `chance`, a default of 0.05 is used.",
    }
  );

  generate(mapSection: generatorInput, chance: number): completedSection {
    const width = mapSection.width;
    const height = mapSection.height;
    const originalGrid = mapSection.grid;

    if (
      !Array.isArray(originalGrid) ||
      originalGrid.length !== height ||
      originalGrid.some((row) => !Array.isArray(row) || row.length !== width)
    ) {
      throw new Error(
        `DecorGenerator.generate: Expected a ${height}×${width} grid, but got mismatched dimensions.`
      );
    }

    const newGrid: number[][] = originalGrid.map((row) => row.slice());

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.random() < chance) {
          const tileKeys = Object.keys(DECOR_TILES).map((k) => Number(k));
          const randomTileID = Phaser.Math.RND.pick(tileKeys);
          newGrid[y][x] = randomTileID;
        }
      }
    }

    return {
      name: "Decor",
      description: `Added random decor at chance = ${chance.toFixed(2)}`,
      grid: newGrid,
      points_of_interest: new Map(), 
    };
  }
}
