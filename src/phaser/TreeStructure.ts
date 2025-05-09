class Node {
    Name: string;
    Coordinates: [number[], number[]];
    Width: number;
    Height: number;
    Children: Node[];

    constructor(Name: string = "", Coordinates: [number[], number[]] = [[],[]], Width: number = 0, Height: number = 0, Children: Node[] = []) {
        this.Name = Name;
        this.Coordinates = Coordinates;
        this.Width = Width;
        this.Height = Height;
        this.Children = Children;
    }
}

export class Tree {
    private Root: Node;
    constructor(Name: string = "", Coordinates: [number[], number[]] = [[],[]], Width: number = 0, Height: number = 0) {
        this.Root = new Node(Name, Coordinates, Width, Height);
    }

    // function: add()
    // parameters: 
    //      layerName: name of new layer
    //      Coordinates: coordinates in reference to parent layer
    //      Width: width of layer
    //      Height: height of layer
    //      parentName: name of the parent layer
    // returns nothing
    add(layerName: string = "", Coordinates: [number[], number[]] = [[],[]], Width: number, Height: number) {
        let newNode = new Node(layerName, Coordinates, Width, Height);
        let parentNode = this.suitableParentFind(Coordinates);
        if (parentNode != null) {
            parentNode.Children.push(newNode);
        }
    }

    // function: delete()
    // parameters: 
    //      layerName: name of the layer you are searching for
    //      parentName: name of the parent layer
    // returns nothing
    delete(layerName: string = "", parentName: string = "") {
        let parentNode = this.findNode(parentName);
        let currentNode = this.findNode(layerName);
        if (parentNode != undefined && currentNode != undefined) {
            const index = parentNode.Children.indexOf(currentNode);
            if (index !== -1) {
                parentNode.Children.splice(index, 1);
            }
        }
    }

    // function: find()
    // parameters: 
    //      layerName: name of the layer you are searching for
    //      currentNode: starts at the root node of the tree
    // returns the coordinates (index 0), width (index 1), and height(index 2).
    find(layerName: string = "", currentNode: Node = this.Root) {
        if (layerName == currentNode.Name) {
            return [
                currentNode.Coordinates, 
                currentNode.Width, 
                currentNode.Height
            ];
        } else {
            for (let childNode of currentNode.Children) {
                this.find(layerName, childNode);
            }
        }
    }

    private suitableParentFind(Coordinates: [number[], number[]], currentNode: Node = this.Root): Node | null {
        // Check if the new node can fit within currentNode
        const isWithin =
            Coordinates[0][0] >= currentNode.Coordinates[0][0] &&
            Coordinates[0][1] >= currentNode.Coordinates[0][1] &&
            Coordinates[1][0] <= currentNode.Coordinates[1][0] &&
            Coordinates[1][1] <= currentNode.Coordinates[1][1];
    
        if (!isWithin) {
            return null;
        }

        for (let childNode of currentNode.Children) {
            const result = this.suitableParentFind(Coordinates, childNode);
            if (result !== null) {
                return result;
            }
        }

        return currentNode;
    }    

    // private function: find()
    // parameters: 
    //      layerName: name of the layer you are searching for
    //      currentNode: starts at the root node of the tree
    // returns the node with Name: layerName
    private findNode(layerName: string = "", currentNode: Node = this.Root) {
        if (layerName == currentNode.Name) {
            return currentNode;
        } else {
            for (let childNode of currentNode.Children) {
                this.find(layerName, childNode);
            }
        }
    }

    printTree(currentNode: Node = this.Root) {
        let currentChildNameString = "";
        for (let childNode of currentNode.Children) {
            currentChildNameString += (childNode.Name + ", ");
        }
        console.log("Parent: " + currentNode.Name + "        Children: " + currentChildNameString);
        for (let childNode of currentNode.Children) {
            this.printTree(childNode);
        }
    }

    getRoot() {
        return this.Root;
    }

    getChildren(currNode: Node) {
        return currNode.Children;
    }
}

