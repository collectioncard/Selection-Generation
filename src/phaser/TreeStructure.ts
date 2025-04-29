class Node {
    Name: string;
    Coordinates: number[];
    Width: number;
    Height: number;
    Children: Node[];

    constructor(Name: string = "", Coordinates: number[] = [], Width: number = 0, Height: number = 0, Children: Node[] = []) {
        this.Name = Name;
        this.Coordinates = Coordinates;
        this.Width = Width;
        this.Height = Height;
        this.Children = Children;
    }
}

export class Tree {
    Root: Node;
    constructor(Root: Node) {
        this.Root = Root;
    }

    // function: add()
    // parameters: 
    //      layerName: name of new layer
    //      Coordinates: coordinates in reference to parent layer
    //      Width: width of layer
    //      Height: height of layer
    //      parentName: name of the parent layer
    // returns nothing
    add(layerName: string = "", Coordinates: [], Width: number, Height: number, parentName: string = "") {
        let newNode = new Node(layerName, Coordinates, Width, Height);
        let parentNode = this.findNode(parentName);
        if (parentNode != undefined) {
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
}

