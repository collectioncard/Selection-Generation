/*
TO DO:
- store relative positions (maybe in {structure id, relativePos} format)
- rename QualPos to AbsPos
- edit paper to reflect the changes
*/
class Structure {
  constructor(type, id, boundingBox) {
    this.type = type;
    this.id = id;
    this.boundingBox = boundingBox;

    // For description generation
    this.absPosition = "";
    this.features = [];
    this.substructures = [];
    this.colors = [];
    this.relativePos = [];
  }
}

export class WorldFactsDatabaseMaker {
  TILE_COLORS = [
    {
      colorID: 0,
      colorName: "red",
      tileIDs: [53, 54, 55, 56, 65, 66, 67, 68],
    },
    {
      colorID: 1,
      colorName: "yellow",
      tileIDs: [4, 10, 11, 12, 16, 22, 23, 28, 34, 35, 36],
    },
    {
      colorID: 2,
      colorName: "brown",
      tileIDs: [73, 74, 75, 76, 85, 86, 87, 88, 45, 46, 47, 48, 57, 59, 60, 69, 70, 71, 72, 81, 82, 83],
    },
    {
      colorID: 3,
      colorName: "green",
      tileIDs: [4, 5, 6, 7, 8, 16, 17, 18, 19, 20, 28, 30, 31, 32],
    },
    {
      colorID: 4,
      colorName: "gray",
      tileIDs: [49, 50, 51, 52, 61, 62, 63, 64, 77, 78, 79, 80, 89, 90, 91, 92],
    },
  ];

  STRUCTURE_TYPES = [
    {
      name: "house",
      tileIDs: [49, 50, 51, 52, 53, 54, 55, 56, 61, 62, 63, 64, 65, 66, 67, 68, 73, 74, 75, 76, 77, 78, 79, 80, 85, 86, 87, 88, 89, 90, 91, 92],
      features: {
        archway: [75, 79],
        chimney: [52, 56],
        dormer: [64, 68],
        door: [86, 87, 88, 90, 91, 92],
        window: [85, 89],
      },
      substructures: {
        roof: [
          49,
          50,
          51,
          52,
          60,
          61,
          62,
          63,
          64, // gray
          53,
          54,
          55,
          56,
          65,
          66,
          67,
          68, // red
        ],
      },
    },
    {
      name: "fence",
      tileIDs: [45, 46, 47, 48, 57, 59, 60, 69, 70, 71, 72, 81, 82, 83],
    },
    {
      name: "forest",
      tileIDs: [4, 5, 6, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 23, 24, 28, 29, 30, 31, 32, 33, 34, 35, 36, 107, 95],
      features: {
        log: [107],
        beehive: [95],
        mushroom: [30],
        sprout: [18],
      },
    },
  ];

  DIRECTIONS = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 }, // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }, // right
  ];

  MIN_STRUCTURE_SIZE = 3; // in tiles

  constructor(mapData, mapWidth, mapHeight, structRange) {
    this.mapData = mapData;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.structRange = structRange;
    this.structures = [];
  }

  getWorldFacts() {
    // Populate
    this.structures = [];
    for (const type of this.STRUCTURE_TYPES) {
      for (const [index, positionArray] of this.getStructures(type.tileIDs).entries()) {
        let struct = new Structure(type.name, index, this.getBoundingBox(positionArray));

        struct.absPosition = this.getStructureAbsPosition(positionArray);
        struct.features = this.getStructureFeatures(type, positionArray);
        if (type.substructures != null) {
          struct.substructures = this.getSubstructures(type, positionArray);
        }
        let basePosition = this.colorSeparation(type, positionArray);
        struct.colors = this.getColors(basePosition);

        this.structures.push(struct);
      }
    }

    // get relative positions and store
    for (let i = 0; i < this.structures.length; i++) {
      let struct = this.structures[i];
      for (let j = 0; j < this.structures.length; j++) {
        let otherID = this.structures[j].id;
        let otherName = this.structures[j].type;
        if (otherID == struct.id && otherName == struct.type) {
          continue;
        }

        otherName = otherName += otherID;

        let relativePos = this.getStructRelativePosition(this.structures[j], struct); // struct is to the DIR of this.structures[j]
        struct.relativePos.push({ otherName, relativePos });
      }
    }
  }

  getStructures(structureTiles) {
    // visitedTiles = a copy of this.mapData where each elem is a bool initialized to false
    const visitedTiles = Array.from({ length: this.mapData.length }, () => Array(this.mapData[0].length).fill(false));
    const structures = [];

    for (let y = 0; y < this.mapData.length; y++) {
      for (let x = 0; x < this.mapData[0].length; x++) {
        // Skip if empty or already visited tiles
        if (this.mapData[y][x] === 0 || visitedTiles[y][x]) continue;

        // Flood fill to find connected structure
        const structure = this.floodFill(x, y, visitedTiles, structureTiles);

        // Store structure if it meets criteria
        if (structure.length > this.MIN_STRUCTURE_SIZE) {
          structures.push(structure);
        }
      }
    }

    return structures;
  }

  // ISSUE: floodFill assumes that the structure has no gaps, which isn't necessarily the case (forests)
  floodFill(startX, startY, visitedTiles, structureTiles) {
    const structure = [];
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
      const { x, y } = stack.pop();

      // Skip if:
      if (
        x < 0 ||
        y < 0 ||
        x >= this.mapData[0].length ||
        y >= this.mapData.length || // out of bounds
        visitedTiles[y][x] || // already visited tile
        structureTiles.findIndex((elem) => elem === this.mapData[y][x]) === -1 // tile is not a structure tile
      ) {
        continue;
      }

      // Mark as visited and add to structure
      visitedTiles[y][x] = true;
      structure.push({ x, y });

      // Add neighbors to stack
      for (const dir of this.DIRECTIONS) {
        for (let i = 1; i <= this.structRange; i++) {
          stack.push({ x: x + dir.x * i, y: y + dir.y * i });
        }
      }
    }

    return structure;
  }

  getBoundingBox(structure) {
    let minX = structure[0].x;
    let maxX = structure[0].x;
    let minY = structure[0].y;
    let maxY = structure[0].y;

    for (const { x, y } of structure) {
      if (x < minX) minX = x;
      else if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      else if (y > maxY) maxY = y;
    }

    return {
      topLeft: { minX, minY },
      bottomRight: { maxX, maxY },
    };
  }

  // ----- DESCRIPTION GENERATION -----//
  // TODO: make a QnA version

  getDescriptionParagraph() {
    let par = "";
    // For each structure
    for (let i = 0; i < this.structures.length; i++) {
      let struct = this.structures[i];
      // Initial identification
      if (i == 0) {
        par += "There is a";
      } else {
        let relativePos = this.getStructRelativePosition(this.structures[i - 1], struct);
        par = par + "To the" + relativePos + " of that " + this.structures[i - 1].type + ", there is a";
      }

      // Structure color
      for (let j = 0; j < struct.colors.length; j++) {
        par = par + " " + struct.colors[j];
        if (j < struct.colors.length - 1) {
          par += " and";
        }
      }

      par = par + " " + struct.type;
      par = par + " at the " + struct.absPosition + " of the selection box";

      // Substructures
      let hasSubstructures = false;
      for (let j = 0; j < struct.substructures.length; j++) {
        hasSubstructures = true;
        if (j == 0) {
          par += " with a ";
        }

        par = par + struct.substructures[j].colors + " " + struct.substructures[j].type;
        if (j == struct.substructures.length - 2) {
          par += ", and ";
        } else if (j < struct.substructures.length - 1) {
          par += ", a ";
        }
      }

      // Features
      for (let j = 0; j < struct.features.length; j++) {
        if (j == 0 && !hasSubstructures) {
          par += " with ";
        } else if (j == 0 && hasSubstructures) {
          par += ", ";
        }

        par += struct.features[j];
        if (j == struct.features.length - 2) {
          par += ", and ";
        } else if (j < struct.features.length - 1) {
          par += ", ";
        }
      }
      par += ". ";
    }

    return par;
  }

  // new struct is to the DIR of prev struct
  getStructRelativePosition(prevStruct, newStruct) {
    let relativePos = "";
    // if the new structure is above the previous
    if (newStruct.boundingBox.topLeft.minY < prevStruct.boundingBox.topLeft.minY) {
      relativePos += " top";
    } else if (newStruct.boundingBox.topLeft.minY > prevStruct.boundingBox.topLeft.minY) {
      relativePos += " bottom";
    }

    if (newStruct.boundingBox.topLeft.minX > prevStruct.boundingBox.topLeft.minX) {
      relativePos += " right";
    } else if (newStruct.boundingBox.topLeft.minX < prevStruct.boundingBox.topLeft.minX) {
      relativePos += " left";
    }

    return relativePos;
  }

  getDescriptionQA() {}

  getStructureAbsPosition(positions) {
    // describe position on map
    return this.getMapZone(positions[0]);
    // ^ this is using basically a random tile of the structure to determine what zone the structure is in i believe?
    // TODO: i think we should consider calculating the center of the structure's bounding box and use that instead
  }

  getStructureFeatures(type, positions) {
    let features = type.features;
    let structFeaturesList = [];

    // describe features
    for (let featureType in features) {
      let featureCount = 0;
      for (let { x, y } of positions) {
        // check for a feature at each position (coord)
        if (features[featureType].includes(this.mapData[y][x])) {
          featureCount++;
        }
      }
      if (featureCount > 0) {
        if (featureCount > 1) {
          featureType += "s";
        } // make feature type plural
        structFeaturesList.push(`${featureCount} ${featureType}`);
      }
    }

    return structFeaturesList;
  }

  getSubstructures(type, positions) {
    let substructures = type.substructures;
    let substructList = [];
    let substructPositions = [];

    for (let substructType in substructures) {
      for (let { x, y } of positions) {
        // check for a substructure tile at each position (coord)
        if (substructures[substructType].includes(this.mapData[y][x])) {
          substructPositions.push({ x, y });
        }
      }

      const substruct = {
        type: substructType,
        colors: [],
      };
      substructList.push(substruct);
    }

    for (let i = 0; i < substructList.length; i++) {
      substructList[i].colors = this.getColors(substructPositions);
    }

    return substructList;
  }

  getColors(positions) {
    let color1 = "";
    let color2 = "";
    let colorsCount = [];

    // init colorsCount
    for (let i = 0; i < this.TILE_COLORS.length; i++) {
      colorsCount[i] = 0;
    }

    for (let { x, y } of positions) {
      for (const color of this.TILE_COLORS) {
        if (color.tileIDs.includes(this.mapData[y][x])) {
          colorsCount[color.colorID] += 1;
        }
      }
    }

    let maxColorIndex = 0;
    maxColorIndex = this.getMaxColor(colorsCount); // get the most frequently-occuring color
    for (const color of this.TILE_COLORS) {
      if (maxColorIndex == color.colorID) {
        color1 = color.colorName;
      }
    }
    colorsCount[maxColorIndex] = 0;
    maxColorIndex = this.getMaxColor(colorsCount); // get the next most frequently-occuring color
    if (maxColorIndex == -1) {
      return [color1];
    }

    for (const color of this.TILE_COLORS) {
      if (maxColorIndex == color.colorID) {
        color2 = color.colorName;
      }
    }

    return [color1, color2];
  }

  // Helper function for getColors()
  getMaxColor(colorsCount) {
    let maxColorFrequency = 0;
    let maxColorIndex = 0;

    for (let i = 0; i < colorsCount.length; i++) {
      if (colorsCount[i] > maxColorFrequency) {
        maxColorFrequency = colorsCount[i];
        maxColorIndex = i;
      }
    }

    if (maxColorFrequency < 1) return -1;

    return maxColorIndex;
  }

  // Separate base tiles from substruct tiles to get individual color descriptions
  colorSeparation(type, positions) {
    if (type.substructures == null) {
      return positions;
    }

    let basePosition = [];
    let substructs = type.substructures;

    // describe features
    for (let { x, y } of positions) {
      for (let substruct in substructs) {
        if (!substructs[substruct].includes(this.mapData[y][x])) {
          basePosition.push({ x, y });
        }
      }
    }

    return basePosition;
  }

  getMapZone(coords) {
    let horizontalSliceSize = this.mapHeight / 3; // top, center, bottom
    let verticalSliceSize = this.mapWidth / 3; // right, center, left

    let { x, y } = coords;
    let mapZone = "";

    // find horizonal zone
    if (y < horizontalSliceSize) {
      mapZone = "top";
    } else if (y < 2 * horizontalSliceSize) {
      mapZone = "center";
    } else {
      mapZone = "bottom";
    }

    // find vertical zone
    if (x < verticalSliceSize) {
      mapZone += " left";
    } else if (x < 2 * verticalSliceSize && mapZone !== "center") {
      mapZone += " center";
    } else {
      mapZone += " right";
    }

    return mapZone;
  }

  printWorldFacts() {
    console.log("Map structures (world facts database):");
    console.log(this.structures);
  }

  // not currently in use (debug util)
  /*
	printLayer(layer){
		let print = ""
		for(const row of layer){
			for(const i of row){
				print += `${i}`.padStart(2, " ");
				print += ` `
			}
			print += '\n'
		}
		return print;
	}
	*/
}
