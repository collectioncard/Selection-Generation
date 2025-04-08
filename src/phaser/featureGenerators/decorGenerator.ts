import {completedSection, FeatureGenerator, generatorInput} from './GeneratorInterface';

const DECOR_CHANCE = 0.03;

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

export const decorGenerator: FeatureGenerator = {
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
      grid: grid,
      points_of_interest: new Map(),
    };
  },
};
