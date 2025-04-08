import {completedSection, FeatureGenerator, generatorInput} from './GeneratorInterface';

const TREE_CHANCE = 0.8; // Percentage of tiles that should be trees *roughly*

const TILE_TYPES = {
  mushrooms: [29],
  bushes: {
    green: [5, 17, 28],
    yellow: [27],
  },
  trees: {
    single: {
      green: [4, 16],
      yellow: [3, 15],
    },
    stack1: {
      green: [6, 8, 30, 32],
      yellow: [9, 11, 33, 35],
    },
    stack2: {
      green: [7, 19, 31, 18, 20],
      yellow: [10, 22, 34, 21, 23],
    },
  },
};

export const forestGenerator: FeatureGenerator = {
  generate(mapSection: generatorInput, _args?: any): completedSection {
    console.log('Generating forest');

    let grid = mapSection.grid;

    for (let y = 0; y < mapSection.height; y++) {
      for (let x = 0; x < mapSection.width; x++) {
        // randomly skip a few tiles
        if (grid[y][x] !== -1 || Math.random() > TREE_CHANCE) {
          continue;
        }

        let plantType: number = Phaser.Math.Between(0, 100);
        let plantColor: 'green' | 'yellow' =
          Math.random() < 0.5 ? 'green' : 'yellow';

        if (plantType < 7) {
          // 7% chance of mushrooms
          grid[y][x] = Phaser.Utils.Array.GetRandom(TILE_TYPES.mushrooms);
        } else if (plantType < 30) {
          // 23% chance of small trees/plants
          grid[y][x] = Phaser.Utils.Array.GetRandom(
            TILE_TYPES.bushes[plantColor],
          );
        } else if (plantType < 60 && y + 1 < mapSection.height) {
          // 30%ish chance of 2 tile trees
          let currTree = TILE_TYPES.trees.single[plantColor];
          if (grid[y + 1][x] === -1) {
            grid[y][x] = currTree[0];
            grid[y + 1][x] = currTree[1];
          }
        } else if (
          plantType < 85 &&
          y + 1 < mapSection.height &&
          x + 1 < mapSection.width
        ) {
          let currTree = TILE_TYPES.trees.stack1[plantColor];
          if (
            grid[y + 1][x] === -1 &&
            grid[y][x + 1] === -1 &&
            grid[y + 1][x + 1] === -1
          ) {
            grid[y][x] = currTree[0];
            grid[y][x + 1] = currTree[1];
            grid[y + 1][x] = currTree[2];
            grid[y + 1][x + 1] = currTree[3];
          }
        } else if (
          y + 2 < mapSection.height &&
          x - 1 >= 0 &&
          x + 1 < mapSection.width
        ) {
          //5 tile trees
          let stack = TILE_TYPES.trees.stack2[plantColor];
          if (
            grid[y + 1][x] === -1 &&
            grid[y + 2][x] === -1 &&
            grid[y + 1][x - 1] === -1 &&
            grid[y + 1][x + 1] === -1
          ) {
            grid[y][x] = stack[0];
            grid[y + 1][x] = stack[1];
            grid[y + 2][x] = stack[2];
            grid[y + 1][x - 1] = stack[3];
            grid[y + 1][x + 1] = stack[4];
          }
        }
      }
    }

    return {
      name: 'forest',
      description: 'A dense forest',
      grid,
      points_of_interest: new Map(),
    };
  },
};
