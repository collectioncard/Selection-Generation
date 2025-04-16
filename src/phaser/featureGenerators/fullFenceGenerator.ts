import {completedSection, FeatureGenerator, generatorInput} from './GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';

const PADDING = 1; // minimum distance from the edge of the section

const tileIDs: Record<number, number> = {
  0b1100: 44, // Top-left
  0b0110: 46, // Top-right
  0b1001: 68, // Bottom-left
  0b0011: 70, // Bottom-right
  0b0100: 45, // Top
  0b0001: 45, // Bottom
  0b1000: 56, // Left
  0b0010: 58, // Right
};

export class FullFenceGenerator implements FeatureGenerator {

  sceneGetter: () => TinyTownScene;

  constructor(sceneGetter: () => TinyTownScene) {
    this.sceneGetter = sceneGetter;
  }

  toolCall = tool(
    async ({}) => {
      console.log("Adding full fence");
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed");
        return "Tool Failed, no reference to scene.";
      }
      this.generate(scene.getSelection(), []);
      return "Fence added successfully";
    },
    {
      name: "fence",
      schema: z.object({}),
      description: "Adds a complete fence around an area.",
    }
  );

  generate(mapSection: generatorInput, _args?: any): completedSection {
    const horizontalLength = Phaser.Math.Between(
      3,
      mapSection.width - PADDING * 2,
    );
    const verticalLength = Phaser.Math.Between(
      3,
      mapSection.height - PADDING * 2,
    );

    const fenceX = Phaser.Math.Between(
      PADDING,
      mapSection.width - horizontalLength - PADDING,
    );
    const fenceY: number = Phaser.Math.Between(
      PADDING,
      mapSection.height - verticalLength - PADDING,
    );

    let grid: number[][] = Array.from({ length: mapSection.height }, () =>
      Array(mapSection.width).fill(-1),
    );

    for (let y: number = fenceY; y < fenceY + verticalLength; y++) {
      for (let x = fenceX; x < fenceX + horizontalLength; x++) {
        const mask =
          (Number(y === fenceY) << 2) |
          (Number(y === fenceY + verticalLength - 1) << 0) |
          (Number(x === fenceX) << 3) |
          (Number(x === fenceX + horizontalLength - 1) << 1);

        if (tileIDs[mask]) {
          grid[y][x] = tileIDs[mask];
        }
      }
    }

    //randomly choose a fence tile on the top or bottom and place a gate
    const gateX = Phaser.Math.Between(
      fenceX + 1,
      fenceX + horizontalLength - 2,
    );
    const gateY = Math.random() < 0.5 ? fenceY : fenceY + verticalLength - 1;
    grid[gateY][gateX] = 69;

    return {
      name: 'fence',
      description: 'A fence',
      grid,
      points_of_interest: new Map(),
    };
  };
};
