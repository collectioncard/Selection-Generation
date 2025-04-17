import {completedSection, FeatureGenerator, generatorInput} from '../featureGenerators/GeneratorInterface';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from '../TinyTownScene';


export const tilecategories = {
    1: "empty grass",
    2: "grass with details",
    3: "flower grass",
    4: "tree",
    5: "tree", //tree
    6: "shrub", //shrub
    7: "shrub", //shrub
    8: "shrub", //shrub
    9: "shrub", //shrub
    10: "shrub", //shrub
    11: "shrub", //shrub
    12: "shrub", //shrub
    13: "path",
    14: "path",
    15: "path",
    16: "tree", //tree
    17: "tree", //tree
    18: "plant", //plant
    19: "shrub", //shrub
    20: "shrub", // shrub
    21: "shrub", //shrub
    22: "shrub", //shrub
    23: "shrub", //shrub
    24: "shrub", //shrub
    25: "path",
    26: "path",
    27: "path",
    28: "shrub", //shrub
    29: "shrub", //shrub
    30: "plant", //plant
    31: "shrub", //shrub
    32: "shrub", //shrub
    33: "shrub", //shrub
    34: "shrub", //shrub
    35: "shrub", //shrub
    36: "shrub", //shrub
    37: "path",
    38: "path",
    39: "path",
    40: "path",
    41: "path",
    42: "path",
    43: "path",
    44: "path",
    45: "fence",
    46: "fence",
    47: "fence",
    48: "fence",
    49: "house roof", //grey roof
    50: "house roof", //grey roof
    51: "house roof", //grey roof
    52: "house roof", //grey roof
    53: "house roof", //red roof
    54: "house roof", //red roof
    55: "house roof", //red roof
    56: "house roof", //red roof
    57: "fence",
    58: "object",
    59: "fence",
    60: "fence",
    61: "house roof", //grey roof
    62: "house roof", //grey roof
    63: "house roof", //grey roof
    64: "house roof", //grey roof
    65: "house roof", //red roof
    66: "house roof", //red roof
    67: "house roof", //red roof
    68: "house roof", //red roof
    69: "fence",
    70: "fence",
    71: "fence",
    72: "fence",
    73: "house", //brown house
    74: "house", //brown house
    75: "house", //brown house
    76: "house", //brown house
    77: "house", //grey house
    78: "house", //grey house
    79: "house", //grey house
    80: "house", //grey house
    81: "fence",
    82: "fence",
    83: "fence",
    84: "object",
    85: "house", //brown house
    86: "house", //brown house
    87: "house", //brown house
    88: "house", //brown house
    89: "house", //grey house
    90: "house", //grey house
    91: "house", //grey house
    92: "house", //grey house
    93: "object",
    94: "object",
    95: "object",
    96: "object",
    97: "castle roof",
    98: "castle roof",
    99: "castle roof",
    100: "castle roof",
    101: "castle roof",
    102: "castle roof",
    103: "castle roof",
    104: "castle roof",
    105: "object",
    106: "object",
    107: "object",
    108: "object",
    109: "castle roof",
    110: "castle roof",
    111: "castle roof",
    112: "castle wall",
    113: "castle wall",
    114: "castle wall",
    115: "castle wall",
    116: "object",
    117: "object",
    118: "object",
    119: "object",
    120: "object",
    121: "castle roof",
    122: "castle roof",
    123: "castle roof",
    124: "castle wall",
    125: "castle wall",
    126: "castle wall",
    127: "castle wall",
    128: "object",
    129: "object",
    130: "object",
    131: "object",
    132: "object"
}

export class TilePlacer implements FeatureGenerator {
    sceneGetter: () => TinyTownScene;

    constructor(sceneGetter: () => TinyTownScene) {
        this.sceneGetter = sceneGetter;
    }

  toolCall = tool(
    async ({a, b, tileID}) => {
      console.log("Adding tile at: ", a, b, tileID);
      let scene = this.sceneGetter();
      if(scene == null){
        console.log("getSceneFailed")
        return "Tool Failed, no reference to scene."
      }
      let selection = scene.getSelection()
      scene.putFeatureAtSelection(this.generate(selection, [a, b, tileID]));
      return `placed ${tileID} at: ${[a,b]}`;
    },
    {
      name: "add",
      schema: z.object({
        a: z.number(),
        b: z.number(),
        tileID: z.string(),
      }),
      description: "Adds a tile to the map.",
    }
  );

  generate(mapSection: generatorInput, _args?: any): completedSection {
    let grid: number[][] = mapSection.grid;
    const decorTile = _args[2];
    grid[_args[0]][_args[1]] = Number(decorTile);

    return {
      name: 'PlaceTile',
      description: 'places a tile at the specified location',
      grid: grid,
      points_of_interest: new Map(),
    };
  };
};
