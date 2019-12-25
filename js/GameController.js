"use strict";

// Constructor del constroller del Juego
function GameController() {
	// Scope-Safe Constructor
	if (!(this instanceof GameController)) {
		return new GameController();
	}

} // fin GameController


/* Dispara un misil a una celda */
GameController.prototype.fire = function fire(cell) {

}


/* Arrastra un misil a una celda */
GameController.prototype.dragMissile = function dragMissile(cell) {
	/* Al seleccionar un misil se cambia el puntero del ratón al misil seleccionado */

}


/* Reinicia el juego */
GameController.prototype.restartGame = function restartGame() {

}


/* Finliza el juego */
GameController.prototype.quitGame = function quitGame() {

}
