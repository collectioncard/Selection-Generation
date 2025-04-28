import {completedSection, FeatureGenerator, generatorInput} from '../featureGenerators/GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';

export class boxPlacer implements FeatureGenerator {
    sceneGetter: () => TinyTownScene;

    constructor(sceneGetter: () => TinyTownScene) {
        this.sceneGetter = sceneGetter;
    }

  toolCall = tool(
    async ({x, y, width, height, tileID, filled = false}) => {
      console.log("Adding box at: ", x, y, tileID);
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed")
        return "Tool Failed, no reference to scene."
      }
      let selection = scene.getSelection()
      scene.putFeatureAtSelection(this.generate(selection, [x, y, width, height, tileID, filled]));
      return `placed box of ${tileID} at: ${[x,y]} with width: ${width} and height: ${height}`;
    },
    {
      name: "box",
      schema: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        tileID: z.string(),
        filled: z.boolean().optional(),
      }),
      description: "Adds box to the map at x,y with width and height, optionally filled. \n Can also be used to draw a vertical or horizontal line by setting width or height to 1.", 
    }
  );

  // args correlate to [x, y, width, height, tileID, filled]
  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;

    const tileID = _args[4]; // get the tile id
    for(let i = 0; i < _args[3]; i++){
      for(let j = 0; j < _args[2]; j++){
        if(_args[5]){
          grid[_args[1] + i][_args[0] + j] = Number(tileID);
        } else if (i == 0 || i == _args[3]-1 || j == 0 || j == _args[2]-1){
          grid[_args[1] + i][_args[0] + j] = Number(tileID);
        }
      }
    }

    return {
      name: 'PlaceBox',
      description: 'places a box at the specified location',
      grid: grid,
      points_of_interest: new Map(),
    };
  };
};
