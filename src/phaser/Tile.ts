export class Tile {
  TileID: number;
  Description: string;

  constructor(TileID: number = -1, Description: string = "") {
    this.TileID = TileID;
    this.Description = Description;
  }
}
