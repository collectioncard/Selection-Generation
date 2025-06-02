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

  /** args [x, y, width, height] */
  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;
    //Why are we using the args instead of just getting the selection dimensions?
    // IDK, but lets just force args 2 and 3 to not be bigger than the array
    _args[2] = Math.min(_args[2], mapSection.width );
    _args[3] = Math.min(_args[3], mapSection.height );
      
    
    console.log(grid)
    for(let i = 0; i < _args[3]; i++){
      for(let j = 0; j < _args[2]; j++){
          grid[i][j] = -2;
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
