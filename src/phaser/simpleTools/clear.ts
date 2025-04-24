import {completedSection, FeatureGenerator, generatorInput} from '../featureGenerators/GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';

export class boxClear implements FeatureGenerator {
    sceneGetter: () => TinyTownScene;

    constructor(sceneGetter: () => TinyTownScene) {
        this.sceneGetter = sceneGetter;
    }

  toolCall = tool(
    async ({x, y, width, height}) => {
      console.log("clear: ", x, y);
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed")
        return "Tool Failed, no reference to scene."
      }
      let selection = scene.getSelection()
      scene.putFeatureAtSelection(this.generate(selection, [x, y, width, height]));
      return `cleared at: ${[x,y]} with width: ${width} and height: ${height}`;
    },
    {
      name: "clear",
      schema: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      description: "clears a box area of the map at x,y with width and height",
    }
  );

  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;
    console.log(grid)
    for(let i = 0; i < _args[3]; i++){
      for(let j = 0; j < _args[2]; j++){
          grid[_args[1] + i][_args[0] + j] = -2;
        }
      }
    console.log("cleared grid: ", grid);

    return {
      name: 'ClearBox',
      description: 'clears a box at the specified location',
      grid: grid,
      points_of_interest: new Map(),
    };
  };
};
