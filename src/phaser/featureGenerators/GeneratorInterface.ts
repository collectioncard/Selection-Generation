import { TinyTownScene } from "../TinyTownScene";

export interface mapCoords {
  x: number;
  y: number;
  pointType?: string;
}

export interface generatorInput {
    grid: number[][];
    width: number;
    height: number;
}

export interface completedSection {
    name: string;
    description: string;
    grid: number[][];
    points_of_interest: Map<string, mapCoords>;
}

export interface FeatureGenerator {
    sceneGetter: () => TinyTownScene;
    toolCall ?: any;
    generate(mapSection: generatorInput, args?: any): completedSection;
}

//TODO: This shouldn't exist
export interface AsyncFeatureGenerator {
    generate(mapSection: generatorInput, args?: any): Promise<completedSection>;
}
