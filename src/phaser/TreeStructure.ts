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
        const parent = parentName ? this.findNode(parentName) : this.findNodeOfChild(layerName, this.Root)
        const node = this.findNode(layerName)
        if (parent && node) {
            const idx = parent.Children.indexOf(node)
            if (idx !== -1) {
                parent.Children.splice(idx, 1)
                return true
            }
        }
        return false
    }

    rename(oldName: string = "", newName: string = ""): boolean {
        const node = this.findNode(oldName)
        if (!node) return false
        node.Name = newName
        return true
    }

    // function: find()
    // parameters: 
    //      layerName: name of the layer you are searching for
    //      currentNode: starts at the root node of the tree
    // returns the coordinates (index 0), width (index 1), and height(index 2).
    public find(layerName: string = "", currentNode: Node = this.Root): [[number[], number[]], number, number] | null  {
        if (currentNode.Name === layerName) {
            return [
                currentNode.Coordinates, 
                currentNode.Width, 
                currentNode.Height
            ];
        } 
        for (const child of currentNode.Children) {
            const found: [[number[], number[]], number, number] | null =
            this.find(layerName, child);
            if (found) return found
        }
        return null
    }

    private findNode(layerName: string = "", current: Node = this.Root): Node | null {
        if (current.Name === layerName) return current
        for (const child of current.Children) {
            const found = this.findNode(layerName, child)
            if (found) return found
        }
        return null
    }

    private findNodeOfChild(
        childName: string,
        current: Node
    ): Node | null {
        for (const child of current.Children) {
            if (child.Name === childName) return current
            const deeper = this.findNodeOfChild(childName, child)
            if (deeper) return deeper
        }
        return null
    }

    private suitableParentFind(Coordinates: [number[], number[]], currentNode: Node = this.Root): Node | null {
        const [[sx, sy], [ex, ey]] = Coordinates
        const [[px, py], [qx, qy]] = currentNode.Coordinates
        const within =
            sx >= px && sy >= py &&
            ex <= qx && ey <= qy

        if (!within) return null

        for (const child of currentNode.Children) {
            const candidate = this.suitableParentFind(Coordinates, child)
            if (candidate) return candidate
        }
        return currentNode
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

    // Expose private findNode so callers can grab a Node object.
    public getNode(layerName: string): Node | null {
        return this.findNode(layerName, this.Root);
    }

    public deleteNode(layerName: string): boolean {
        return this.delete(layerName);
    }
}

