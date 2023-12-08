import { Battleship } from './static/battleship.js';

class Game {
    #ships1;
    #ships2;
    #openedCells1;
    #openedCells2;
    #currentTurn;
    #started;
    #timeStarted;
    #timeEnded;

    constructor() {
        this.#ships1 = [];
        this.#ships2 = [];
        this.#openedCells1 = [];
        this.#openedCells2 = [];
        this.#currentTurn = 0;
        this.#started = false;
        this.#timeStarted = null;
        this.#timeEnded = null;
    }
    get currentTurn() {
        return this.#currentTurn;
    }
    get started() {
        return this.#started;
    }
    get openedCells1() {
        return this.#openedCells1;
    }
    get openedCells2() {
        return this.#openedCells2;
    }
    get ships1() {
        return this.#ships1;
    }
    get ships2() {
        return this.#ships2;
    }
    get timeStarted() {
        return this.#timeStarted;
    }
    get timeEnded() {
        return this.#timeEnded;
    }

    placeShip(player, ship, bothReadyCallback) {
        if (this.#started) {
            throw new Error('The game has started already')
        }
        if (![1, 2].includes(player)) {
            throw new RangeError('Player must be either 1 or 2');
        }
        if (!(ship instanceof Battleship)) {
            throw new TypeError('Ship must be an instance of Battleship');
        }
        let currentShipList = player === 1 ? this.#ships1 : this.#ships2;
        if (currentShipList.filter(value => value.size === ship.size).length >= 5 - ship.size) // max ship count: 4 - (ship.size - 1)
        {
            return { success: false, error: 'Too many ships of this size' };
        }
        for (const { points } of currentShipList) {
            for (const i of points) {
                for (const j of ship.points) {
                    for (let k = -1; k <= 1; k++) {
                        for (let l = -1; l <= 1; l++) {
                            if (i[0] == j[0] + k && i[1] == j[1] + l) {
                                return { success: false, error: 'Ship intersects with another ship' };
                            }
                        }
                    }

                }
            }
        }
        currentShipList.push(ship);
        if (this.#ships1.length === 10 && this.#ships2.length === 10 && bothReadyCallback !== undefined) {
            bothReadyCallback();
        }
        return { success: true };
    }

    removeShipAt(player, x, y, unreadyCallback) {
        if (this.#started) {
            throw new Error('The game has started already')
        }
        if (![1, 2].includes(player)) {
            throw new RangeError('Player must be either 1 or 2');
        }
        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            throw new TypeError('Coordinates must be integers');
        }
        if (x < 0 || x > 9 || y < 0 || y > 9) {
            throw new RangeError('Coordinates are out of bounds');
        }
        let currentShipList = player === 1 ? this.#ships1 : this.#ships2;
        let foundShip = null;
        for (const ship of currentShipList) {
            for (const i of ship.points) {
                if (x == i[0] && y == i[1]) {
                    foundShip = ship;
                    break;
                }
            }
        }
        if (foundShip !== null) {
            if (this.#ships1.length === 10 && this.#ships2.length === 10 && unreadyCallback !== undefined) {
                unreadyCallback();
            }
            currentShipList = currentShipList.filter(value => value !== foundShip);
            if (player === 1) {
                this.#ships1 = currentShipList;
            }
            else {
                this.#ships2 = currentShipList;
            }
            return foundShip;
        }
        return false;
    }

    #processShot(x, y, openedCells, ships) {
        for (const cell of openedCells) {
            if (cell[0] === x && cell[1] === y) {
                throw new Error('Point was selected already');
            }
        }
        for (const ship of ships) {
            for (const point of ship.points) {
                if (point[0] === x && point[1] === y) {
                    ship.killCell(x, y);
                    let result = {
                        x: x,
                        y: y,
                        hit: true,
                        kill: ship.isDead
                    };
                    if (result.kill) {
                        for (const i of ship.points) {
                            let cellsToOpen = [];
                            for (let k = -1; k <= 1; k++) {
                                for (let j = -1; j <= 1; j++) {
                                    cellsToOpen.push([x + k, y + j]);
                                }
                            }
                            cellsToOpen.filter(value => openedCells.filter(o => o[0] === value[0] && o[1] === value[1]).length === 0).forEach(value => openedCells.push(value));
                        }
                        result.ship = ship;
                        if (ships.filter(s => !s.isDead).length === 0) {
                            result.finished = true;
                            this.#timeEnded = Date.now();
                        }
                    }
                    openedCells.push([x, y, true]);
                    return result;
                }
            }
        }
        this.#currentTurn = this.#currentTurn === 0 ? 1 : 0;
        openedCells.push([x, y, false]);
        return { x: x, y: y, hit: false };
    }

    shoot(x, y) {
        if (!this.#started) {
            throw new Error("The game hasn't started yet");
        }
        if (!(Number.isInteger(x) && Number.isInteger(y))) {
            throw new TypeError('Cell coordinates must be integers');
        }
        if (x < 0 || x > 9 || y < 0 || y > 9) {
            throw new RangeError('Coordinates are out of bounds')
        }
        if (this.#currentTurn == 0) {
            let shotResult = this.#processShot(x, y, this.#openedCells2, this.#ships2);
            return shotResult;
        }
        else {
            let shotResult = this.#processShot(x, y, this.#openedCells1, this.#ships1);
            return shotResult;
        }
    }

    startGame() {
        if (this.#started) {
            throw new Error('The game has started already');
        }
        if (this.#ships1.length >= 10 && this.#ships2.length >= 10) {
            this.#started = true;
            this.#timeStarted = Date.now();
        }
        return this.#started;
    }
}

export { Game };