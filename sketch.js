let grid;
let squareSize;
let goalState;
let stack = [];
let visited = new Set();
let currentState;
let goalStateFound = false;
let animationSpeed = 5; // Control the speed of animation
let buttonPressed = false;
let sel;
let queue = [];
let path = [];

const COLORS = [
  "lightgray",
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
];

const MOVE_REFERENCE = ["up", "down", "right", "left"];
const MOVE_OFFSET = [
  [-1, 0], // up
  [1, 0], // down
  [0, 1], //right
  [0, -1], //left
];

class BlockState {
  constructor(grid, parent = null, move = null) {
    this.grid = grid;
    this.length = grid.length;
    this.moveList = [];
    this.id = this.generateStateKey(grid);
    this.parent = parent;
    this.move = move;
  }

  generateStateKey(grid) {
    return JSON.stringify(grid);
  }

  findColors() {
    let foundColors = [];
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        if (
          this.grid[i][j] !== 0 &&
          foundColors.indexOf(this.grid[i][j]) === -1
        ) {
          foundColors.push(this.grid[i][j]);
        }
      }
    }
    return foundColors;
  }

  cellcanMove(x, y, direction) {
    const newX = x + direction[0];
    const newY = y + direction[1];
    if (
      newX >= 0 &&
      newX < this.length &&
      newY >= 0 &&
      newY < this.grid[x].length
    ) {
      return (
        this.grid[newX][newY] === this.grid[x][y] || this.grid[newX][newY] === 0
      );
    }
    return false;
  }

  blockcanMove(direction, color) {
    for (let i = 0; i <= this.length - 1; i++) {
      for (let j = 0; j <= this.length - 1; j++) {
        if (this.grid[i][j] === color) {
          if (!this.cellcanMove(i, j, direction)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  possibleMoves() {
    const colorList = this.findColors();
    for (let i = 0; i < colorList.length; i++) {
      // Assuming colorIndex 0 is for empty cell
      for (let j = 0; j < MOVE_OFFSET.length; j++) {
        if (this.blockcanMove(MOVE_OFFSET[j], colorList[i])) {
          this.moveList.push({
            colorID: colorList[i],
            direction: MOVE_REFERENCE[j],
          });
        }
      }
    }
  }

  moveBlock(move) {
    // Destructure the move object for easier access to colorID and direction.
    const { colorID, direction } = move;
    const moveRef = MOVE_OFFSET[MOVE_REFERENCE.indexOf(direction)];
    let blocksToMove = []; // Store the blocks that will move.
    let newPositions = []; // Store the new positions for these blocks.

    // Find all blocks of the colorID that need to be moved.
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < this.length; j++) {
        if (this.grid[i][j] === colorID) {
          const newX = i + moveRef[0];
          const newY = j + moveRef[1];
          // Check if the new position is valid.
          if (
            newX >= 0 &&
            newX < this.length &&
            newY >= 0 &&
            newY < this.length
          ) {
            blocksToMove.push({ x: i, y: j });
            newPositions.push({ x: newX, y: newY });
          }
        }
      }
    }

    // Check if all new positions are valid (either empty or the same color).
    const canMoveAllBlocks = newPositions.every((pos, index) => {
      const blockAtNewPos = this.grid[pos.x][pos.y];
      return blockAtNewPos === 0 || blockAtNewPos === colorID;
    });

    // If all blocks can move, update the grid.
    if (canMoveAllBlocks) {
      // Create a deep copy of the grid.
      let newGrid = this.grid.map((subArray) => [...subArray]);

      // First, clear the original positions in the new grid.
      blocksToMove.forEach((block) => {
        newGrid[block.x][block.y] = 0;
      });

      // Then, move the blocks to their new positions in the new grid.
      newPositions.forEach((pos, index) => {
        newGrid[pos.x][pos.y] = colorID;
      });

      return new BlockState(newGrid, this, move); // Return the new state with the updated grid.
    }

    return this; // If the move isn't valid, return the current state unchanged.
  }

  display() {
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        fill(COLORS[this.grid[i][j]]);
        rect(j * squareSize, i * squareSize, squareSize, squareSize);
      }
    }
  }

  isGoal(goal) {
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid.length; j++) {
        if (goal.grid[i][j] !== 0) {
          if (this.grid[i][j] !== goal.grid[i][j]) {
            return false;
          }
        }
      }
    }
    return true;
  }
  tracePath() {
    let moves = [];
    let currentState = this;
    while (currentState.parent !== null) {
      // Iterate until you reach the initial state which has no parent
      moves.push(currentState.move); // Add the move that led to this state
      currentState = currentState.parent;
    }
    moves.reverse(); // Reverse to get the correct order from start to goal
    return moves;
  }
}

function setup() {
  sel = createSelect();
  sel.option("DFS");
  sel.option("BFS");
  sel.selected("DFS");
  sel.style("margin-right", "20px");

  createCanvas(650, 300); // Make the canvas wider to accommodate two grids side by side
  squareSize = width / 9; // Since the canvas is now wider to fit two grids

  // Initial grid setup
  let small_initial = [
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [2, 0, 6, 6],
    [2, 2, 0, 6],
  ];
  let initialState = new BlockState(small_initial);
  initialState.display();
  stack.push(initialState);
  queue.push(initialState);
  currentState = initialState;

  button = createButton("Start");
  button.style("font-size", "24px");
  button.style("text-align", "center");
  button.style("padding", "20px");
  button.style("margin-right", "20px");
  button.mouseClicked(() => {
    buttonPressed = true;
  });
  // Goal grid setup - all zeros except for the bottom left which is purple (index 6 in COLORS)
  let small_goal = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 1, 1], // Purple block in the bottom left corner
  ];
  goalState = new BlockState(small_goal);

  // Display initial state grid
  //initialState.display();

  // Translate the drawing origin to the right before displaying the goal state
  translate(4 * squareSize + 50, 0);

  // Display goal state grid
  goalState.display();
}

function draw() {
  let algo = sel.selected();
  console.log(algo);
  if (algo === "DFS") {
    if (stack.length > 0 && buttonPressed) {
      let currentVertex = stack.pop();

      if (!visited.has(currentVertex.id)) {
        visited.add(currentVertex.id);
        currentVertex.display();

        if (currentVertex.isGoal(goalState)) {
          console.log("Goal Found");
          console.log(currentVertex.tracePath());
          noLoop();
        }

        currentVertex.possibleMoves();
        for (let neighbor of currentVertex.moveList) {
          let possibleState = currentVertex.moveBlock(neighbor);
          if (!visited.has(possibleState.id)) {
            stack.push(possibleState);
          }
        }
      }
    }
  } else if (algo == "BFS") {
    if (queue.length > 0 && buttonPressed) {
      let currentVertex = queue.shift();

      if (!visited.has(currentVertex.id)) {
        visited.add(currentVertex.id);
        currentVertex.display();

        if (currentVertex.isGoal(goalState)) {
          console.log("Goal Found");
          console.log(currentVertex.tracePath());
          noLoop();
        }

        currentVertex.possibleMoves();
        for (let neighbor of currentVertex.moveList) {
          let possibleState = currentVertex.moveBlock(neighbor);
          if (!visited.has(possibleState.id)) {
            let newPath = path.concat(neighbor);
            path = newPath;
            queue.push(possibleState);
          }
        }
      }
    }
  }
  frameRate(animationSpeed);
}
