import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TinyTownScene } from "../TinyTownScene";

//Names the current rectangular selection as a new layer.
export class NameLayerTool {
  sceneGetter: () => TinyTownScene;

  constructor(sceneGetter: () => TinyTownScene) {
    this.sceneGetter = sceneGetter;
  }

  toolCall = tool(
    async ({ name }: { name: string }) => {
      const scene = this.sceneGetter();
      scene.nameSelection(name);
      return `Layer "${name}" created.`;
    },
    {
      name: "name_layer",
      schema: z.object({
        name: z.string().describe("The name to assign to the current selection"),
      }),
      description: "Save the current selection under a named layer",
    }
  );
}

export class SelectLayerTool {
    constructor(private getScene: () => TinyTownScene) {}
  
    toolCall = tool(
        async ({ layerName }: { layerName: string }) => {
            this.getScene().selectLayer(layerName);
            return `Layer "${layerName}" selected.`;
        },
        {
            name: "select_layer",
            schema: z.object({
            layerName: z.string().describe("Name of the layer to re-select")
            }),
            description: "Re-select a previously named layer (draws its bounds and collects its tiles)"
        }
    );
}

// /**
//  * Moves all tiles in an existing named layer by dx, dy in tile‐space.
//  */
// export class MoveLayerTool {
//   sceneGetter: () => TinyTownScene;

//   constructor(sceneGetter: () => TinyTownScene) {
//     this.sceneGetter = sceneGetter;
//   }

//   toolCall = tool(
//     async ({
//       layerName,
//       dx,
//       dy,
//     }: {
//       layerName: string;
//       dx: number;
//       dy: number;
//     }) => {
//       const scene = this.sceneGetter();
//       scene.moveLayer(layerName, dx, dy);
//       return `Layer "${layerName}" moved by (dx: ${dx}, dy: ${dy}).`;
//     },
//     {
//       name: "move_layer",
//       schema: z.object({
//         layerName: z.string().describe("The name of the layer to move"),
//         dx: z.number().describe("Number of tiles to shift in the X direction"),
//         dy: z.number().describe("Number of tiles to shift in the Y direction"),
//       }),
//       description: "Move a previously named layer by a given offset",
//     }
//   );
// }
