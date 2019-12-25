"use strict";

const DEFAULT_PLAYER_NAME = "New Player";


// Constructor del objeto Jugador
function Player(name) {
	if (!(this instanceof Player)) {
		return new Player();
	}

	this.name = name || DEFAULT_PLAYER_NAME;

	// Array de coordenadas de los buques del jugador
	this.shipsCoordinates = [];

	// Identificador del Jugador ante el servidor
	this.ID = this.generateID();

}// fin Player


Player.prototype.setShipsCoordinates = function setShipsCoordinates(coordinates) {
	this.shipsCoordinates = coordinates;
}


Player.prototype.getShipsCoordinates = function getShipsCoordinates() {
	return this.shipsCoordinates;
}


/* Genera un código único para identificarse ante el servidor */
Player.prototype.generateID = function generateID() {
	let arbitraryMaxNumber = 65536;

	let arbitraryNumber = Utilities.getRandomInt(arbitraryMaxNumber);

	return Utilities.hashCode(arbitraryNumber.toString());
}
