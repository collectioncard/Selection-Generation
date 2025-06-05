import {completedSection, FeatureGenerator, generatorInput} from './GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';

const DECOR_CHANCE = 0.05;

const DECOR_TILES = {
  27: 'orange tree',
  28: 'green tree',
  29: 'mushroom',
  57: 'wheelbarrow',
  94: 'beehive',
  95: 'target',
  106: 'log',
  107: 'bag',
  130: 'bucket empty',
  131: 'bucket full',
};

export class DecorGenerator implements FeatureGenerator {
    sceneGetter: () => TinyTownScene;

    constructor(sceneGetter: () => TinyTownScene) {
        this.sceneGetter = sceneGetter;
    }

static DecorArgsSchema = z.object({
        chance: z.number().min(0).max(1), // unfortnatly the .default() parameter does not seem to be supported.
        x: z.number().min(0).max(40).optional(),
        y: z.number().min(0).max(25).optional(),
        width: z.number().min(1).max(50).optional(),
        height: z.number().min(1).max(50).optional(),
      });

  toolCall = tool(
    async (args: z.infer<typeof DecorGenerator.DecorArgsSchema>) => {
      console.log("Adding decor with args: ", args);
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed")
        return "Tool Failed, no reference to scene."
      }
      let selection = scene.getSelection()
      scene.putFeatureAtSelection(this.generate(selection, args));
      return `${args}`;
    },
    {
      name: "decor",
      schema: DecorGenerator.DecorArgsSchema,
      description: 
        "Adds decor to the map with a given chance (default chance of 0.03). Optional args: x, y, width, height",
    }
  );

  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;

    const width = _args?.width ?? mapSection.width;
    const height = _args?.height ?? mapSection.height;
    const xstrt = _args?.x ?? 0;
    const ystrt = _args?.y ?? 0;
    for (let y = ystrt; y < height+ystrt; y++) {
      for (let x = xstrt; x < width+xstrt; x++) {
        if (Math.random() < DECOR_CHANCE) {
          const decorTile = Phaser.Math.RND.pick(Object.keys(DECOR_TILES));
          grid[y][x] = Number(decorTile);
        }
      }
    }

    return {
      name: 'Decor',
      description: 'Just some random stuff in the area specified',
      grid: grid,
      points_of_interest: new Map(),
    };
  };
};
