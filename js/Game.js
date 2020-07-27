"use strict";

// A nivel global, las variables declaradas con "const" o "let" no crean propiedades en el objeto global (window).

// warshipMap es un mapa con las clases disponibles de buques.
// Para agregar una nueva clase de buque, sólamente hay que agregarla al mapa warshipMap
let warshipMap = new Map();

warshipMap.set(0, "SharkWarship");

warshipMap.set(1, "EelWarship");


/* Constructor del objeto Game */
function Game() {
	// Scope-Safe Constructor
	if (!(this instanceof Game)) {
		return new Game();
	}

	this.player = new Player();

	this.playerBoard = null;

	this.enemiesBoard = null;

}// fin Game


Game.prototype.initializeBoards = function initializeBoards(boardXSize, boardYSize) {
	// new Board arrojará un error si falla

	this.playerBoard = new Board(boardXSize, boardYSize);

	this.enemiesBoard = new Board(boardXSize, boardYSize);
}


Game.prototype.initializeShips = function initializeShips(numberOfShips, shipSize) {
	let ships = [];

	for (let i = 0; i < numberOfShips; i++) {

		let shipCoordinates = this.playerBoard.generateShipCoordinates(shipSize);

		// La clase de buques se crea de forma dinámica
		let warshipType = warshipMap.get(Utilities.getRandomInt(warshipMap.size));

		/* Crea la clase de buque seleccionada al azar usando el objeto global (window).
		 * Ya que tanto SharkWarship como EelWarship son constructores globales,
		 * y como cualquier variable global es propiedad del objeto global,
		 * se puede acceder a estos constructores a través de window */
		let warship = new window[warshipType](shipCoordinates.newShipLocations, shipCoordinates.orientation);

		/* Otra alternativa es crear la clase de buque seleccionada al azar usando eval de forma legítima
		 * ya que el nombre de la clase del buque está en un mapa, no proviene del usuario */
		// let warship = eval(`new ${warshipType}(shipCoordinates.newShipLocations, shipCoordinates.orientation)`);

		ships.push(warship);
	}

	this.player.setShipsCoordinates(ships);
}


Game.prototype.displayBoards = function displayBoard() {
	this.playerBoard.display("playerBoard");

	this.enemiesBoard.display("enemiesBoard");
}


Game.prototype.displayPlayerShips = function displayPlayerShips() {

	let ships = this.player.getShipsCoordinates();

	for (let warshipN = 0; warshipN < ships.length; ++warshipN) {

		let ship = ships[warshipN];

		/* row y col son las coordenadas de la primera celda,
		 * (de arriba hacia abajo y de derecha a izquierda), que ocupa el buque
		 */
		let row = ship.location[0].row;

		let col = ship.location[0].column;

		// La celda que ocupa el buque en el mapa del jugador
		let mapCell = document.querySelector(`#playerBoard .row #cell_${row}_${col}`);

		// Cada buque se dibuja a si mismo en la celda que ocupa
		ship.display(mapCell);

	} // Fin for

} // Fin displayPlayerShips


Game.prototype.dispatchTurn = function dispatchTurn() {

}


Game.prototype.generateFleet = function generateFleet() {
	// Flotilla de 5 buques de 4 celdas = 20 celdas
	// Flotilla de 4 buques de 5 celdas = 20 celdas
	// Flotilla de 7 buques de 3 celdas = 21 celdas
	// Flotilla de 3 buques de 5 celdas más 2 barcos de 3 celdas = 21 celdas
	// Flotilla de 3 buques de 4 celdas más 3 barcos de 3 casillas = 21 celdas
	// .....

} //Fin generateFleet
