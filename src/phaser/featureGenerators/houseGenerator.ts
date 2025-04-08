import {FeatureGenerator, completedSection, generatorInput} from './GeneratorInterface';

const MIN_HOUSE_WIDTH = 3;
const MIN_HOUSE_HEIGHT = 3;
const BORDER_PADDING = 1;
const INITIAL_WINDOW_CHANCE = 0.5;

let points_of_interest = new Map();

export const houseGenerator: FeatureGenerator = {
  generate(mapSection: generatorInput, _args?: any): completedSection {
    console.log('Generating house');
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
      description: 'A house',
      grid,
      points_of_interest: points_of_interest,
    };
  },
};
