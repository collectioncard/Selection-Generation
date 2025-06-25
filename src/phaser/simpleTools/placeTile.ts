import {
  completedSection,
  FeatureGenerator,
  generatorInput,
} from "../featureGenerators/GeneratorInterface";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from "../TinyTownScene";

export class TilePlacer implements FeatureGenerator {
  sceneGetter: () => TinyTownScene;

  constructor(sceneGetter: () => TinyTownScene) {
    this.sceneGetter = sceneGetter;
  }

  toolCall = tool(
    async ({ x, y, tileID }) => {
      console.log("Adding tile at: ", x, y, tileID);
      let scene = this.sceneGetter();
      if (scene == null) {
        console.log("getSceneFailed");
        return "Tool Failed, no reference to scene.";
      }
      let selection = scene.getSelection();
      try {
        await scene.putFeatureAtSelection(
          this.generate(selection, [x, y, tileID]),
        );
        return `placed ${tileID} at: ${[x, y]}`;
      } catch (e) {
        console.error("putFeatureAtSelection failed:", e);
        return `Failed to place tile`;
      }
    },
    {
      name: "add",
      schema: z.object({
        x: z.number(),
        y: z.number(),
        tileID: z.string(),
      }),
      description: "Adds a tile to the map.",
    },
  );

  /** args is [x, y, tileID] */
  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;

    const tileID = _args[2];
    grid[_args[1]][_args[0]] = Number(tileID);

    return {
      name: "PlaceTile",
      description: "places a tile at the specified location",
      grid: grid,
      points_of_interest: new Map(),
    };
  }
}
