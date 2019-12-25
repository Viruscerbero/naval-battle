"use strict";

/* TODO: Esto no debería ser posible:
 * 1. Instanciar Game más de una vez
 *
 * 2. Instanciar Board directamente, (con new Board()), y no a través de Game
 *
 * 3. Instanciar directamente Player, Ship o Missile (con new), y no a través de Game
*/

/* Main es a una variable de scope global que al estar definida con let
 * no es agregada como propiedad del objeto global "window" como las definidas con var.
 * Main usa el patrón Namespace, pero usará el patrón Sandbox.
*/

if (typeof Main === "undefined") {
	var Main = {};
}

const BOARD_X_SIZE = 20;

const BOARD_Y_SIZE = 20;

const NUMBER_OF_SHIPS = 3;

const SHIPS_SIZE = 4;

// Podemos llamar al constructor de Game sin "new" porque el constructor es scope-safe
Main.Game = Game();

Main.Game.initializeBoards(BOARD_X_SIZE, BOARD_Y_SIZE);

Main.Game.initializeShips(NUMBER_OF_SHIPS, SHIPS_SIZE);

Main.Game.displayBoards();

Main.Game.displayPlayerShips();

Main.GameController = new GameController();
