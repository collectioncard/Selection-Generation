import {completedSection, FeatureGenerator, generatorInput} from '../featureGenerators/GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';

export class FullUndo implements FeatureGenerator {
    sceneGetter: () => TinyTownScene;

    constructor(sceneGetter: () => TinyTownScene) {
        this.sceneGetter = sceneGetter;
    }

  toolCall = tool(
    async ({}) => {
      console.log("undoing last task");
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed")
        return "Tool Failed, no reference to scene."
      }
      console.log("last data" + scene.LastData)
      scene.putFeatureAtSelection(scene.LastData, true, true);
      return `undid last task`;
    },
    {
      name: "undo",
      schema: z.object({
      }),
      description: "Undoes the last action.",
    }
  );
  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;
    const decorTile = _args[2];
    grid[_args[1]][_args[0]] = Number(decorTile);

    return {
      name: 'PlaceTile',
      description: 'places a tile at the specified location',
      grid: grid,
      points_of_interest: new Map(),
    };
  }
};
