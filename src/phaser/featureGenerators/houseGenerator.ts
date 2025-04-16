import {FeatureGenerator, completedSection, generatorInput} from './GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';

const MIN_HOUSE_WIDTH = 3;
const MIN_HOUSE_HEIGHT = 3;
const BORDER_PADDING = 1;
const INITIAL_WINDOW_CHANCE = 0.5;

// House tile mappings for reference
const HOUSE_TILES = {
  // Grey roof tiles
  48: 'grey roof tile',
  49: 'grey roof tile',
  50: 'grey roof tile',
  51: 'grey roof chimney',
  60: 'grey roof tile',
  61: 'grey roof tile',
  62: 'grey roof tile',
  63: 'grey roof pointed',
  
  // Red roof tiles
  52: 'red roof left edge',
  53: 'red roof middle',
  54: 'red roof right edge',
  55: 'red roof chimney',
  64: 'red roof bottom left',
  65: 'red roof bottom middle',
  66: 'red roof bottom right',
  67: 'red roof pointed',
  
  // Brown house tiles
  72: 'brown house left wall',
  73: 'brown house middle wall',
  74: 'brown house entrance',
  75: 'brown house right wall',
  84: 'brown house window',
  85: 'brown house single door',
  86: 'brown house double door left',
  87: 'brown house double door right',
  
  // Grey house tiles
  76: 'grey house left wall',
  77: 'grey house middle wall',
  78: 'grey house entrance',
  79: 'grey house right wall',
  88: 'grey house window',
  89: 'grey house single door',
  90: 'grey house double door left',
  91: 'grey house double door right'
};

let points_of_interest = new Map();

export class HouseGenerator implements FeatureGenerator {
  sceneGetter: () => TinyTownScene;

  constructor(sceneGetter: () => TinyTownScene) {
    this.sceneGetter = sceneGetter;
  }

  toolCall = tool(
    async () => {
      console.log('Generating house');
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed");
        return "Tool Failed, no reference to scene.";
      }
      let selection = scene.getSelection()
      scene.putFeature(this.generate(selection, []));
      return `House added`;
    },
    {
      name: "house",
      schema: z.object({
        style: z.string().optional(),
      }),
      description: "Adds a house to the map",
    }
  );

  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid = mapSection.grid;

    const houseWidth = Phaser.Math.Between(
      MIN_HOUSE_WIDTH,
      mapSection.width - BORDER_PADDING * 2,
    );
    const houseHeight = Phaser.Math.Between(
      MIN_HOUSE_HEIGHT,
      mapSection.height - BORDER_PADDING * 2,
    );
    const houseX = Phaser.Math.Between(
      BORDER_PADDING,
      mapSection.width - houseWidth - BORDER_PADDING,
    );
    const houseY = Phaser.Math.Between(
      BORDER_PADDING,
      mapSection.height - houseHeight - BORDER_PADDING,
    );

    const textureOffset: -4 | 0 = Math.random() < 0.5 ? -4 : 0;

    const doorX = houseX + Phaser.Math.Between(1, houseWidth - 2);

    let y = houseY;
    const chimneyX = Phaser.Math.Between(-1, houseWidth - 1);

    //Top Roof
    grid[y][houseX] = 52 + textureOffset;
    grid[y].fill(53 + textureOffset, houseX + 1, houseX + houseWidth - 1);
    grid[y][houseX + houseWidth - 1] = 54 + textureOffset;
    if (chimneyX >= 0) {
      grid[y][houseX + chimneyX] = 55 + textureOffset;
    }

    //Bottom Roof
    y = houseY + 1;
    grid[y][houseX] = 64 + textureOffset;
    grid[y].fill(65 + textureOffset, houseX + 1, houseX + houseWidth - 1);
    grid[y][houseX + houseWidth - 1] = 66 + textureOffset;

    //fill in the walls and windows
    let windowChance = INITIAL_WINDOW_CHANCE;
    for (y = houseY + 2; y < houseY + houseHeight; y++) {
      grid[y][houseX] = 76 + textureOffset;
      grid[y][houseX + houseWidth - 1] = 79 + textureOffset;

      for (let x = houseX + 1; x < houseX + houseWidth - 1; x++) {
        if (x === doorX && y === houseY + houseHeight - 1) {
          // Stop placing windows where the door goes!
          grid[y][x] = 77 + textureOffset;
        } else {
          grid[y][x] =
            Math.random() < windowChance ? ((windowChance -= 0.2), 88) : 77;
          grid[y][x] += textureOffset;
        }
      }
    }

    //finally, place the door and awning
    grid[houseY + 1][doorX] = 67 + textureOffset;
    grid[houseY + houseHeight - 1][doorX] = 89 + textureOffset;
    
    points_of_interest.set('door', { x: doorX, y: houseY + houseHeight - 1 });

    return {
      name: 'House',
      description: textureOffset === 0 ? 'A grey stone house' : 'A brown wooden house',
      grid,
      points_of_interest: points_of_interest,
    };
  };
};
