import express from 'express';
import bodyParser from 'body-parser';
import { Game } from './game.js';
import { Battleship } from './static/battleship.js';


const app = express();

const port = 8080;

const games = new Map();

const staticOptions = {
    dotfiles: 'ignore',
    extensions: ['htm', 'html'],
    redirect: false
};
let game = null;
let hostId = null;
let guestId = null;
let gameloopLongpollSubscribers = [];

let hostReady = false;
let guestReady = false;

app.use('/static', express.static('static', staticOptions));
app.use(bodyParser.json());

function notifyLongpollSubscribers(subscribers, message) {
    for (const sub of subscribers) {
        sub.end(message);
    }
}

function notifyAboutGameReady() {
    notifyLongpollSubscribers(gameloopLongpollSubscribers, 'ready');
}

app.post('/create', (_, res) => {
    if (game !== null) {
        res.end(JSON.stringify({ success: false, error: 'Someone has created the game already' }));
        return;
    }
    game = new Game();
    hostId = crypto.randomUUID();
    res.end(JSON.stringify({ success: true, playerId: hostId }));
});

app.get('/join', (_, res) => {
    if (game === null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "The game isn't created yet" }));
        return;
    }
    if (guestId !== null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "Someone already joined this game" }));
        return;
    }
    guestId = crypto.randomUUID();
    res.end(JSON.stringify({ success: true, playerId: guestId }));
});

app.get('/playerRole', (req, res) => {
    let id = req.query.playerId;
    let role = "not playing";
    if (id === hostId) {
        role = "host";
    } else if (id === guestId) {
        role = "guest";
    }
    res.end(JSON.stringify({ role: role }));
});

app.get('/gameState', (_, res) => {
    let state = { created: game !== null };
    if (state.created) {
        state.started = game.started;
        if (game.started) {
            state.currentTurn = game.currentTurn;
        }
        else {
            state.secondPlayerJoined = guestId !== null;
            if (state.secondPlayerJoined) {
                state.ready = game.ships1.length === 10 && game.ships2.length === 10;
            }
        }
    }
    res.end(JSON.stringify(state));
});

app.post('/placeShip', (req, res) => {
    if (game === null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "The game isn't created yet" }));
        return;
    }
    try {
        if (req.body.playerId === hostId) {
            let shipPlaced = game.placeShip(1, new Battleship(req.body.ship), notifyAboutGameReady);
            res.end(JSON.stringify(shipPlaced));
        } else if (req.body.playerId === guestId) {
            let shipPlaced = game.placeShip(2, new Battleship(req.body.ship), notifyAboutGameReady);
            res.end(JSON.stringify(shipPlaced));
        } else {
            res.status(403);
            res.end(JSON.stringify({ success: false, error: "Unrecognized player" }));
        }
    } catch (e) {
        res.status(400);
        res.end(JSON.stringify({ success: false, error: e.message }));
    }
});

app.post('/shoot', (req, res) => {
    if (game === null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "The game isn't created yet" }));
        return;
    }
    if (!(req.body.playerId === hostId && game.currentTurn === 0 || req.body.playerId === guestId && game.currentTurn === 1)) {
        res.status(403);
        res.end(JSON.stringify({ success: false, error: "It is not this player's turn" }));
        return;
    }
    try {
        let result = game.shoot(req.body.x, req.body.y);
        notifyLongpollSubscribers(gameloopLongpollSubscribers, JSON.stringify(result));
        if (result.finished) {
            game = null;
        }
        res.end(JSON.stringify({ success: true }));
    }
    catch (e) {
        res.end(JSON.stringify({ success: false, error: e.message }));
    }
});

app.get('/waiting', (req, res) => {
    gameloopLongpollSubscribers.push(res);
});

app.post('/startGame', (req, res) => {
    if (game === null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "The game isn't created yet" }));
        return;
    }
    if (req.body.playerId !== hostId && req.body.playerId !== guestId) {
        res.status(403);
        res.end(JSON.stringify({ success: false, error: "Unrecognized player" }));
        return;
    }
    if (game.ships1.length === 10 && game.ships2.length === 10) {
        if (req.body.playerId === hostId) {
            hostReady = true;
        }
        else {
            guestReady = true;
        }
        res.end(JSON.stringify({ success: true }));
    }
    if (hostReady && guestReady) {
        let result = game.startGame();
        if (result) {
            notifyLongpollSubscribers(gameloopLongpollSubscribers, 'gamestart');
        }
    }
});

app.get('/myShips', (req, res) => {
    if (game === null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "The game isn't created yet" }));
        return;
    }
    if (req.query.playerId === hostId) {
        res.end(JSON.stringify({
            success: true,
            ships: game.ships1
        }));
    }
    else if (req.query.playerId === guestId) {
        res.end(JSON.stringify({
            success: true,
            ships: game.ships2
        }));
    }
    else {
        res.status(403);
        res.end(JSON.stringify({ success: false, error: "Unrecognized player" }));
    }
});

app.get('/openedCells', (req, res) => {
    if (game === null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "The game isn't created yet" }));
        return;
    }
    if (req.query.playerId === hostId) {
        res.end(JSON.stringify({
            success: true,
            myOpenedCells: game.openedCells1,
            enemyOpenedCells: game.openedCells2,
            enemyDeadShips: game.ships2.filter(s => s.isDead)
        }));
    }
    else if (req.query.playerId === guestId) {
        res.end(JSON.stringify({
            success: true,
            myOpenedCells: game.openedCells2,
            enemyOpenedCells: game.openedCells1,
            enemyDeadShips: game.ships1.filter(s => s.isDead)
        }));
    }
    else {
        res.status(403);
        res.end(JSON.stringify({ success: false, error: "Unrecognized player" }));
    }
});

app.delete('/deleteShip', (req, res) => {
    if (game === null) {
        res.status(409);
        res.end(JSON.stringify({ success: false, error: "The game isn't created yet" }));
        return;
    }
    try {
        if (req.body.playerId === hostId) {
            let shipDeleted = game.removeShipAt(1, req.body.x, req.body.y, () => notifyLongpollSubscribers(gameloopLongpollSubscribers, 'unready'));
            let result = { success: shipDeleted !== false };
            if (result.success) {
                result.ship = shipDeleted;
                hostReady = false;
            }
            res.end(JSON.stringify(result));
        } else if (req.body.playerId === guestId) {
            let shipDeleted = game.removeShipAt(2, req.body.x, req.body.y, () => notifyLongpollSubscribers(gameloopLongpollSubscribers, 'unready'));
            let result = { success: shipDeleted !== false };
            if (result.success) {
                result.ship = shipDeleted;
                guestReady = false;
            }
            res.end(JSON.stringify(result));
        } else {
            res.status(403);
            res.end(JSON.stringify({ success: false, error: "Unrecognized player" }));
        }
    } catch (e) {
        res.status(400);
        res.end(JSON.stringify({ success: false, error: e.message }));
    }
})

app.listen(port);

console.log("Started listening on port", port);