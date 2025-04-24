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

      // the way that the undo works is that it replaces the whole map with a save state
      // in effect it puts the whole previous map onto the map.
      scene.putFeatureAtSelection(scene.LastData, true, true);
      return `undid last task`; // this is how the LLM knows that the last action was an undo.
    },
    {
      name: "undo",
      schema: z.object({
      }),
      description: "Undoes the last action.",
    }
  );

  // this is not used.
  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;

    return {
      name: 'Undo - None',
      description: '',
      grid: grid,
      points_of_interest: new Map(),
    };
  }
};
