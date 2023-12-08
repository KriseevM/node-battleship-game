class Battleship {
    #size;
    #x;
    #y;
    #direction;
    #deadCells;

    constructor(x, y, direction, size) {
        if (typeof x === "object") {
            this.#construct(x.x, x.y, x.direction, x.size);
        }
        else {
            this.#construct(x, y, direction, size);
        }
    }

    get x() {
        return this.#x;
    }
    get y() {
        return this.#y;
    }
    get direction() {
        return this.#direction;
    }
    get size() {
        return this.#size;
    }

    killCell(x, y)
    {
        if(!(Number.isInteger(x) && Number.isInteger(y)))
        {
            throw new TypeError('coordinates must be integers');
        }
        let contains = false;
        for(const p of this.points)
        {
            if(p[0] === x && p[1] === y)
            {
                contains = true;
                break;
            }
        }
        if(!contains)
        {
            throw new RangeError('This cell does not belong to this ship');
        }
        for(const dead of this.#deadCells)
        {
            if(dead[0] === x && dead[1] === y)
            {
                return false;
            }
        }
        this.#deadCells.push([x, y]);
        return true;
    }

    get isDead() {
        return this.#deadCells.length === this.#size;
    }

    move(x, y, direction) {
        if (Number.isInteger(x) && x >= 0 && x <= 9) {
            this.#x = x;
        }
        if (Number.isInteger(y) && y >= 0 && y <= 9) {
            this.#y = y;
        }
        if (Number.isInteger(direction) && direction >= 0 && direction <= 1) {
            this.#direction = direction;
        }
    }
    get points() {
        let points = [];
        for (let i = 0; i < this.#size; i++) {
            if (this.#direction === 0) {
                points.push([this.#x + i, this.#y]);
            }
            else {
                points.push([this.#x, this.#y + i]);
            }
        }
        return points;
    }
    #construct(x, y, direction, size) {
        if (!(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(direction) && Number.isInteger(size))) {
            throw new TypeError('All parameters for Battleship constructor must be integers');
        }
        if (size < 1 || size > 4) {
            throw new RangeError('The ship size was invalid');
        }
        this.#size = size;
        if (direction < 0 || direction > 1) {
            throw new RangeError('Direction can only be 0, 1, 2 or 3');
        }
        this.#direction = direction;
        if (x < 0
            || x + (direction == 0 ? size - 1 : 0) > 9
            || y < 0
            || y + (direction == 1 ? size - 1 : 0) > 9) {
            throw new RangeError('Ship coordinates are out of bounds');
        }
        this.#x = x;
        this.#y = y;
        this.#deadCells = [];
    }

    toJSON() {
        return { x: this.#x, y: this.#y, direction: this.#direction, size: this.#size };
    }
}

export { Battleship };