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

  toolCall = tool(
    async ({chance}) => {
      console.log("Adding decor with chance: ", chance);
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed")
        return "Tool Failed, no reference to scene."
      }
      let selection = scene.getSelection()
      scene.putFeatureAtSelection(this.generate(selection, []));
      return `${chance}`;
    },
    {
      name: "decor",
      schema: z.object({
        chance: z.number().min(0).max(1), // unfortnatly the .default() parameter does not seem to be supported.
      }),
      description: "Adds decor to the map with a given chance (default chance of 0.03).",
    }
  );

  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;

    for (let y = 0; y < mapSection.height; y++) {
      for (let x = 0; x < mapSection.width; x++) {
        if (Math.random() < DECOR_CHANCE) {
          const decorTile = Phaser.Math.RND.pick(Object.keys(DECOR_TILES));
          grid[y][x] = Number(decorTile);
        }
      }
    }

    return {
      name: 'Decor',
      description: 'Just some random stuff',
      type: 'decor',
      grid: grid,
      points_of_interest: new Map(),
    };
  };
};
