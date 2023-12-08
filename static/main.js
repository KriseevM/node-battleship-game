import { Battleship } from './battleship.js';

document.getElementById('jsdisabled').remove();

let role = 'host';

let myTurn = false;

fetch('/gameState').then(async (value) => {
    let response = JSON.parse(await value.text());

    if (!response.created) {
        let button = document.createElement('button');
        button.value = "host";
        button.innerHTML = "Host a game";
        button.addEventListener("click", async (e) => {
            let hostRes = JSON.parse(await (await fetch('/create', { method: "POST" })).text());
            if (hostRes.success) {
                button.remove();
                longpoll().then(onReadyMessage);
                window.sessionStorage.setItem('id', hostRes.playerId);
                let h1 = document.createElement('h1');
                h1.id = 'actionTitle';
                h1.innerText = 'Установите ваши корабли';
                document.body.append(h1);
                drawField('', freeCellClick);
            }
            else {
                window.location.reload();
            }
        });
        document.body.append(button);
    }
    else {
        if (response.started) {
            if (window.sessionStorage.getItem('id')) {
                let loadedRole = JSON.parse(await (await fetch(`/playerRole?playerId=${window.sessionStorage.getItem('id')}`)).text()).role;
                if (loadedRole === 'host' || loadedRole === 'guest') {
                    role = loadedRole;
                    document.body.innerHTML = "";
                    onGameStartMessage('gamestart');
                    if (response.currentTurn === 1) {
                        changeTurn();
                    }
                    let loadedCells = JSON.parse(await (await fetch(`/openedCells?playerId=${window.sessionStorage.getItem('id')}`)).text());
                    for (const cell of loadedCells.myOpenedCells) {
                        let cellElement = document.getElementById(`ownField-${cell[0]}-${cell[1]}`);
                        if (cellElement === null) continue;
                        if (cellElement.classList.contains('ship')) {
                            cellElement.classList.add('hit');
                        }
                        else {
                            cellElement.classList.add('miss');
                        }
                    }
                    for (const ship of loadedCells.enemyDeadShips.map(s => new Battleship(s))) {
                        for (const cell of ship.points) {
                            let cellElement = document.getElementById(`enemyField-${cell[0]}-${cell[1]}`);
                            cellElement.classList.add('hit');
                            cellElement.innerHTML += '';
                        }

                    }
                    for (const cell of loadedCells.enemyOpenedCells) {
                        let cellElement = document.getElementById(`enemyField-${cell[0]}-${cell[1]}`);
                        if (cellElement === null) continue;
                        if (cellElement.classList.contains('hit')) continue;
                        cellElement.classList.add('miss');
                        cellElement.innerHTML += '';
                    }
                }
                else {
                    showAlreadyStartedMessage();
                    longpoll().then(waitForGame());
                }
            }
            else {
                showAlreadyStartedMessage();
                longpoll().then(waitForGame());
            }
        }
        else {
            if (response.secondPlayerJoined) {
                if (window.sessionStorage.getItem('id')) {
                    let loadedRole = JSON.parse(await (await fetch(`/playerRole?playerId=${window.sessionStorage.getItem('id')}`)).text()).role;
                    if (loadedRole === 'host' || loadedRole === 'guest') {
                        role = loadedRole;
                        await restoreMyShips();
                    }
                    else {
                        showAlreadyStartedMessage();
                        longpoll().then(waitForGame());
                    }
                }
                else {
                    showAlreadyStartedMessage();
                    longpoll().then(waitForGame());
                }
            }
            else {
                if (window.sessionStorage.getItem('id')) {
                    let loadedRole = JSON.parse(await (await fetch(`/playerRole?playerId=${window.sessionStorage.getItem('id')}`)).text()).role;
                    if (loadedRole === 'host') {
                        role = loadedRole;
                        await restoreMyShips();
                    }
                    else {
                        showJoinButton();
                    }
                }
                else {
                    showJoinButton();
                }
            }
        }
    }
});
async function restoreMyShips() {
    let myShips = JSON.parse(await (await fetch(`/myShips?playerId=${window.sessionStorage.getItem('id')}`)).text());
    longpoll().then(onReadyMessage);
    let h1 = document.createElement('h1');
    h1.id = 'actionTitle';
    h1.innerText = 'Установите ваши корабли';
    document.body.append(h1);
    drawField('', freeCellClick);
    for (const { points } of myShips.ships.map(s => new Battleship(s))) {
        for (const cell of points) {
            let cellElement = document.getElementById(`cell-${cell[0]}-${cell[1]}`);
            cellElement.classList.add('ownShip');
            cellElement.innerHTML += '';
            cellElement.addEventListener("click", (e) => {
                e.stopImmediatePropagation();
                occupiedCellClick(cell[1], cell[0]);
            });
        }
    }
}

function showJoinButton() {
    role = 'guest';
    let button = document.createElement('button');
    button.value = "join";
    button.innerHTML = "Join a game";
    button.addEventListener("click", async (e) => {
        let hostRes = JSON.parse(await (await fetch('/join')).text());
        if (hostRes.success) {
            button.remove();
            longpoll().then(onReadyMessage);
            window.sessionStorage.setItem('id', hostRes.playerId);
            let h1 = document.createElement('h1');
            h1.id = 'actionTitle';
            h1.innerText = 'Установите ваши корабли';
            document.body.append(h1);
            drawField('', freeCellClick);
        }
        else {
            window.location.reload();
        }
    });
    document.body.append(button);
}

async function freeCellClick(row, column) {
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let c = document.getElementById(`cell-${column + i}-${row + j}`);
            if (c === null) {
                continue;
            }
            if (c.classList.contains('ownShip')) {
                return;
            }
        }
    }
    let len = -1;

    do {
        len = prompt('Укажите длину корабля');
        if (len === null) {
            return;
        }
    } while (!([1, 2, 3, 4].includes(+len)));
    let dirs = [];
    try {
        dirs.push(new Battleship(column, row, 0, +len));
    } catch (e) { }
    try {
        dirs.push(new Battleship(column, row, 1, +len));
    } catch (e) { }
    let vertical = false;
    if (dirs.length === 2) {
        vertical = +len > 1 ? confirm('Поставить корабль вертикально?') : false;
    }
    else if (dirs.length === 1) {
        vertical = dirs[0].direction === 1;
    }
    else {
        alert('Этот корабль выйдет за границы');
        await freeCellClick(row, column);
        return;
    }
    let ship = new Battleship(column, row, vertical ? 1 : 0, +len);
    let res = JSON.parse(await (await fetch('/placeShip', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            playerId: window.sessionStorage.getItem('id'),
            ship: { x: column, y: row, direction: vertical ? 1 : 0, size: +len }
        })
    })).text());
    if (res.success === true) {
        for (const p of ship.points) {
            let el = document.getElementById(`cell-${p[0]}-${p[1]}`);
            el.classList.add('ownShip');
            el.innerHTML += '';
            el.addEventListener("click", (e) => {
                e.stopImmediatePropagation();
                occupiedCellClick(p[1], p[0]);
            });
        }
    }
    else {
        alert(res.error);
        await freeCellClick(row, column);
    }
}
function onReadyMessage(msg) {
    if (msg === 'ready') {
        if (role === 'host') {
            let button = document.createElement('button');
            button.innerHTML = "Start";
            button.id = 'startBtn';
            button.addEventListener('click', (e) => {
                fetch('/startGame', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ playerId: window.sessionStorage.getItem('id') })
                });
            });
            document.body.append(button);
        }
        longpoll().then(onGameStartMessage);
    }
    else {
        longpoll().then(onReadyMessage);
    }
}
function onGameStartMessage(msg) {
    if (msg === 'gamestart') {
        myTurn = role === 'host';
        document.body.innerHTML = "";
        drawField('Ваше поле', null, 'ownField');
        fetch(`/myShips?playerId=${window.sessionStorage.getItem('id')}`).then(async (res) => {
            let data = JSON.parse(await res.text());
            for (const { points } of data.ships.map(s => new Battleship(s))) {
                for (const p of points) {
                    document.getElementById(`ownField-${p[0]}-${p[1]}`).classList.add('ship');
                }
            }
        });
        drawField('Поле противника', shoot, 'enemyField');
        let turnSpan = document.createElement('span');
        turnSpan.id = 'turn';
        turnSpan.innerText = myTurn ? "Ваш ход" : "Ход противника";
        document.body.append(turnSpan);
        longpoll().then(gameloopLongpollHandler);
    }
    else if (msg === 'unready') {
        longpoll().then(onReadyMessage);
        if (role === 'host') {
            document.getElementById('startBtn').remove();
        }
    }
}

async function occupiedCellClick(row, column) {
    if (!confirm('Удалить корабль с этой клетки?')) {
        return;
    }
    let data = JSON.parse(await ((await fetch('/deleteShip', {
        method: "DELETE",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            playerId: window.sessionStorage.getItem('id'),
            x: column,
            y: row
        })
    })).text()));
    if (data.success === true) {
        for (const deletedPoint of (new Battleship(data.ship)).points) {
            let cell = document.getElementById(`cell-${deletedPoint[0]}-${deletedPoint[1]}`);
            cell.classList.remove('ownShip');
            cell.innerHTML += '';
            cell.addEventListener("click", (e) => {
                e.stopImmediatePropagation();
                freeCellClick(deletedPoint[1], deletedPoint[0]);
            });
        }
    }
}
async function askToPlaceShip(column, row) {


}

function drawField(title, cellClickCallback, cellIdPrefix = 'cell') {
    let container = document.createElement('div');
    container.classList.add("fieldContainer");
    container.innerHTML += `<h1>${title}</h1>`;
    let table = document.createElement('table');
    let row = document.createElement('tr');
    row.innerHTML += ('<td class="fieldCell"></td>');
    for (let i = 1; i <= 10; i++) {
        row.innerHTML += (`<td class="fieldCell">${i}</td>`);
    }
    table.append(row);
    for (let i = 0; i < 10; i++) {
        row = document.createElement('tr');
        row.innerHTML += (`<td class="fieldCell">${String.fromCharCode(65 + i)}</td>`);
        for (let j = 0; j < 10; ++j) {
            let cell = document.createElement('td');
            cell.classList.add('fieldCell');
            cell.classList.add(cellIdPrefix);
            cell.id = `${cellIdPrefix}-${j}-${i}`;
            if (cellClickCallback !== undefined && cellClickCallback !== null) {
                console.log(cellClickCallback);
                cell.addEventListener("click", (e) => {
                    e.stopImmediatePropagation();
                    cellClickCallback(i, j)
                });
            }
            row.append(cell);
        }
        table.append(row);
    }
    container.append(table);
    document.body.append(container);
}

function showAlreadyStartedMessage() {
    document.body.innerHTML =
        `<h1>Кто-то другой уже играет</h1>
        <h2>Придётся подождать :(</h2>`;
}

async function longpoll() {
    let response = await fetch('/waiting');
    return await response.text();
}

function gameloopLongpollHandler(msg) {
    if (msg === 'gamefinish') {
        return;
    }
    let data = JSON.parse(msg);
    if (data.hit === false) {
        if (myTurn) {
            let cell = document.getElementById(`enemyField-${data.x}-${data.y}`);
            cell.innerHTML += '';
            cell.classList.add('miss');
        }
        else {
            let cell = document.getElementById(`ownField-${data.x}-${data.y}`);
            cell.classList.add('miss');
        }
        changeTurn();
    }
    else if (data.hit === true) {
        if (myTurn) {
            let cell = document.getElementById(`enemyField-${data.x}-${data.y}`);
            cell.innerHTML += '';
            cell.classList.add('hit');
            if (data.kill) {
                let ship = new Battleship(data.ship);
                displayKilledShip(ship, 'enemyField');
                if (data.finished) {
                    alert('Поздравляю! Вы выиграли!');
                    window.location.reload();
                }
            }
        }
        else {
            let cell = document.getElementById(`ownField-${data.x}-${data.y}`);
            cell.classList.add('hit');
            if (data.kill) {
                displayKilledShip(new Battleship(data.ship), 'ownField');
                if (data.finished) {
                    alert('Вы проиграли!');
                    window.location.reload();
                }
            }
        }
    }
    longpoll().then(gameloopLongpollHandler);
}

function changeTurn() {
    myTurn = !myTurn;
    document.getElementById('turn').innerText = myTurn ? "Ваш ход" : "Ход противника";
}

function displayKilledShip(ship, fieldIdPrefix) {
    for (const p of ship.points) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (p[0] + i > 9 || p[0] + i < 0 || p[1] + j > 9 || p[1] + j < 0) {
                    continue;
                }
                let cell = document.getElementById(`${fieldIdPrefix}-${p[0] + i}-${p[1] + j}`);
                if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
                    continue;
                }
                cell.innerHTML += '';
                cell.classList.add('miss');
            }
        }
    }
}

async function shoot(row, column) {
    if (!myTurn) {
        return;
    }
    await fetch('/shoot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playerId: window.sessionStorage.getItem('id'), x: column, y: row })
    });
}

function waitForGame(msg) {
    try {
        let data = JSON.parse(msg);
        if (data.finished) {
            window.location.reload();
            return;
        }
    }
    catch (e) { }
    longpoll().then(waitForGame);
}