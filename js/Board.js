"use strict";

/* Por ahora el tablero se crea en el navegador, más adelante se creará en el servidor */

// A nivel global, las variables declaradas con "const" o "let" no crean propiedades en el objeto global (window).

const MIN_BOARD_X_SIZE = 8; // Cantidad mínima de celdas en el eje X
const MIN_BOARD_Y_SIZE = 8; // Cantidad mínima de celdas en el eje Y
const DEFAULT_BOARD_X_SIZE = 15; // Cantidad por defecto de celdas en el eje X
const DEFAULT_BOARD_Y_SIZE = 15; // Cantidad por defecto de celdas en el eje Y
const MAX_BOARD_X_SIZE = 50; // Cantidad máxima de celdas en el eje X
const MAX_BOARD_Y_SIZE = 50; // Cantidad máxima de celdas en el eje Y

// Las dimensiones de cada tablero se calculan con base al 80% de la altura o la anchura de la pantalla
const BOARD_SIZE = (
	() => {
		let innerSize = (window.innerHeight < window.innerWidth) ? window.innerHeight : window.innerWidth;

		/* Factor de corrección para landscape, cuando la pantalla es lo suficientemente ancha para los dos tableros, 
		 * y para portrait */
		let fc = 20;

		// Si la orientación es landscape hay que asegurarse de que los dos tableros quepan.
		// Esto no es necesario si la orientación es portrait
		if (window.innerWidth > window.innerHeight) {
			if (window.innerWidth <= (2 * innerSize)) {
				// fc es la diferencia entre el ancho de la pantalla y el doble del tamaño de los dos tablero más un 20%.
				// fc está expresado en porcentaje
				fc = Math.floor( (1 - (window.innerWidth / (2 * innerSize * 1.2)) ) * 100);
			}
		}

		return Math.floor(innerSize * (1 - fc/100));
	}
)();

const BOARD_WIDTH = BOARD_SIZE // Ancho del tablero en pixeles
const BOARD_HEIGHT = BOARD_SIZE // Alto del tablero en pixeles

const HORIZONTAL = 0;
const VERTICAL = 1;
const MAIN_DIAGONAL = 2;
const COUNTER_DIAGONAL = 3;
const HORIZONTAL_MARK = "h"
const VERTICAL_MARK = "v";
const DIAGONAL_MARK = "d";
const COUNTER_DIAGONAL_MARK = "cd";
const CELL_MARK = 1;
const MAX_UINT8ARRAY_VALUE = 255; // (2^8 -1)


/* Constructor del objeto Board */
function Board(boardXSize = DEFAULT_BOARD_X_SIZE, boardYSize = DEFAULT_BOARD_Y_SIZE) {
	// Scope-Safe Constructor
	if (!(this instanceof Board)) {
		return new Board(boardXSize, boardYSize);
	}

	// Rechazamos números no enteros y que sean menores que el mímimo o mayores que el máximo
	if (
		!Number.isInteger(boardXSize) ||
		!Number.isInteger(boardYSize) ||
		!(boardXSize >= MIN_BOARD_X_SIZE) && (boardXSize <= MAX_BOARD_X_SIZE) ||
		!(boardYSize >= MIN_BOARD_Y_SIZE) && (boardYSize <= MAX_BOARD_Y_SIZE)
	) {
		alert("Error al inicializar el tablero");

		// El Constructor puede lanzar una excepción
		throw new Error("Error al inicializar el tablero");
	}

	// Inicializa el tablero
	this.boardXSize = boardXSize;

	this.boardYSize = boardYSize;

	// boardXSize y boardYSize son iguales porque el tablero es cuadrado,
	// pero aunque no fuera éste el caso, la altura máxima de la diagonal sería siempre boardYSize
	this.boardDiagSize = boardYSize;

	// Array de dos dimensiones
	this.boardMatrix = [];

	// Se inicializa el tablero
	this.setBoardMatrix(boardXSize, boardYSize);

	this.cellPixelsWidth = Math.floor(BOARD_WIDTH/this.boardXSize);

	this.cellPixelsHeight = Math.floor(BOARD_HEIGHT/this.boardYSize);

	// Establece cuatro direcciones para los buques
	this.orientations = [HORIZONTAL, VERTICAL, MAIN_DIAGONAL, COUNTER_DIAGONAL];

	// Filas con celdas potencialmente disponibles para posicionar horizontalmente un buque
	this.rowsWithEmptyCells = null;

	// Columnas con celdas potencialmente disponibles para posicionar verticalmente un buque
	this.columnsWithEmptyCells = null;

	// Diagonales con celdas potencialmente disponibles para posicionar en diagonal un buque
	this.diagonalsWithEmptyCells = null;

	// Contradiagonales con celdas potencialmente disponibles para posicionar diagonalmente un buque
	this.counterDiagonalsWithEmptyCells = null;
}


/* Retorna las dimensiones de las celdas en píxeles */
Board.prototype.getCellPixelsSize = function getCellPixelsSize() {
	return {
		"cellPixelsWidth": this.cellPixelsWidth,
		"cellPixelsHeight": this.cellPixelsHeight
	}

}


/* Inicializa el tablero */
Board.prototype.setBoardMatrix = function setBoardMatrix(boardXSize, boardYSize) {
	for (var col = 0; col < this.boardXSize; ++col) {

		this.boardMatrix[col] = [];

		for (var row = 0; row < this.boardYSize; ++row) {
			this.boardMatrix[col][row] = 0;
		} // Fin for row

	} // Fin for col

}// Fin setBoardMatrix


/* Retorna una copia del tablero */
Board.prototype.getBoard = function getBoard() {
	if (
		typeof this.boardMatrix !== "undefined" &&
		this.boardMatrix.length > 0
	) {
		return JSON.parse(
			JSON.stringify(this.boardMatrix)
		);
	}
	else {
		alert("Error al recuperar el tablero");

		// Por alguna razón el tablero no está definido
		throw new Error("Error al recuperar el tablero");
	}

} // Fin getBoard


/* Elimina una orientación de la lista de posibles orientaciones para evitar reelegirla */
Board.prototype.banThisOrientation = function banThisOrientation(orientation) {
	for (let i = 0, orLength = this.orientations.length; i < orLength; i++) {
		if (this.orientations[i] == orientation) {
    		this.orientations.splice(i, 1);

			// No hay necesidad de seguir en el bucle
			break;
   		}
	}
} // Fin banThisOrientation


/*	Façade que implementa un patrón Strategy.

	Retorna una posición para el barco dentro del tablero.

	Mientras no se haya obtenido una posición válida para el buque y aún haya orientaciones posibles,
	generateShipCoordinates trata de asignar una posición utilizando dos tipos de estrategias:
	primero una aleatoria, y luego una de asignación directa de celdas contiguas libres.

	Si falla la estrategia de asignación de posición aleatoria se cambia a una de asignación directa
	de celdas libres.

	Si falla la estrategia de asignación directa de celdas, se elimina la orientación del array
	de orientaciones posibles y se intenta asignar otra orientación usando la estrategia de posicionamiento aleatorio.

	Si las estrategias han fallado para todas las orientaciones, lanza un error.
*/
Board.prototype.generateShipCoordinates = function generateShipCoordinates(shipSize) {
	// Array que contendrá las coordenadas del buque
	let newShipLocations = [];

	// Mientras no se tenga una ubicación válida para el buque y haya orientaciones disponibles
	while (newShipLocations.length == 0 && this.orientations.length > 0) {
		// Se selecciona una posible orientación
		let orientationIndex = Utilities.getRandomInt(this.orientations.length);

		// La variable "orientation" debe estar disponible fuera del bloque while,
		// por esta razón se declara con var en vez de let
		var orientation = this.orientations[orientationIndex];

		// Se selecciona la estrategia de posicionamiento aleatorio del buque
		newShipLocations = this.generateRandomShipCoordinates(shipSize, orientation);

		// Si la estrategia de asignación aleatoria no devuelve una posición válida,
		// se cambia a la estrategia de posicionamiento directo
		if (newShipLocations.length == 0) {
			newShipLocations = this.generateDirectShipCoordinates(shipSize, orientation);

			// Si la estrategia de posicionamiento directo no devuelve una posición válida,
			// se elimina la actual orientación de las posibles orientaciones
			// para que no se vuelva a escoger aleatoriamente
			if (newShipLocations.length == 0) {
				this.banThisOrientation(orientation);
			}
		}

	}// Fin while

	// Si se obtuvo una orientación válida, ésta se retorna
	if (newShipLocations.length != 0) {
		return {
			"orientation": orientation,
			"newShipLocations": newShipLocations
		};
	}
	else {
		throw new Error("No hay suficientes celdas libres en el tablero para ubicar los buques");
	}

} // Fin generateShipCoordinates


/*	Forma parte del patrón Strategy.
	Función de ejecución de la estrategia seleccionada para la generación de coordenadas del buque.
*/
Board.prototype.generateCoordinates = function generateCoordinates(shipSize, MAX_TRIES) {

	return this.coordinatesGenerator.generateCoordinates(shipSize, MAX_TRIES);
}


/*	Forma parte del patrón Strategy.

	Retorna una posición para el barco dentro del tablero.

	Cada subestrategia de generateRandomShipCoordinates realiza hasta un máximo de 50 intentos
	para posicionar un buque de forma aleatoria.
*/
Board.prototype.generateRandomShipCoordinates = function generateRandomShipCoordinates(shipSize, orientation) {
	// Se asigna la estrategia de posicionamiento aleatorio del buque
	switch (orientation) {
		case 0:
			this.coordinatesGenerator = new HorizontalRandomCoordinatesGenerator(this);

		break;

		case 1:
			this.coordinatesGenerator = new VerticalRandomCoordinatesGenerator(this);

		break;

		case 2:
			this.coordinatesGenerator = new DiagonalRandomCoordinatesGenerator(this);

		break;

		case 3:
			this.coordinatesGenerator = new CounterDiagonalRandomCoordinatesGenerator(this);

		break;

		default:
		break;
	}

	// Cantidad máxima de intentos para evitar un lazo infinito
	const MAX_TRIES = 49;

	// Forma parte del patrón Strategy.
	// Ejecuta la estrategia de posicionamiento aleatorio del buque.
	let newShipLocations = this.generateCoordinates(shipSize, MAX_TRIES);

	return newShipLocations;
}


/* Forma parte del patrón Strategy. Estrategia para generar coordenadas aleatorias horizontales */
let HorizontalRandomCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize, MAX_TRIES) {
		// Inicializamos un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Contador de intentos
		let tries = 0;

		// Bandera que detiene el bucle while durante la búsqueda de una nueva ubicación para un buque
		let isLocationValid = false;

		// Mientras no se obtenga una ubicación válida ni se supere la cantidad máxima de intentos
		while (!isLocationValid && tries <= MAX_TRIES) {
			let row = Utilities.getRandomInt(board.boardXSize);

			let col = Utilities.getRandomInt(board.boardYSize - shipSize);

			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {

				if (tempBoardMatrix[row][col + i] == 0) {
					// La celda está libre
					newShipLocations.push({"row": row, "column": (col + i)});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row][col + i] = HORIZONTAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces tenemos una ubicación
			if (i == shipSize) {
				isLocationValid = true;

				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques horizontales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new HorizontalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);
			}
			else {
				// El intento de asignación aleatoria falló
				++tries;
			}

		}//fin while

		return newShipLocations;

	} // Fin generateCoordinates
};


/* Forma parte del patrón Strategy. Estrategia para generar coordenadas aleatorias de orientación vertical */
let VerticalRandomCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize, MAX_TRIES) {
		// Inicializamos un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Contador de intentos
		let tries = 0;

		// Bandera que detiene el bucle while durante la búsqueda de una nueva ubicación para un buque
		let isLocationValid = false;

		// Mientras no se obtenga una ubicación válida ni se supere la cantidad máxima de intentos
		while (!isLocationValid && tries <= MAX_TRIES) {
			let row = Utilities.getRandomInt(board.boardXSize - shipSize);

			let col = Utilities.getRandomInt(board.boardYSize);

			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {
				if (tempBoardMatrix[row + i][col] == 0) {
					// La celda está libre
					newShipLocations.push({"row": (row + i), "column": col});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row + i][col] = VERTICAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces tenemos una ubicación
			if (i == shipSize) {
				isLocationValid = true;

				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques verticales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new VerticalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);
			}
			else {
				// El intento de asignación aleatoria falló
				++tries;
			}

		}//fin while

		return newShipLocations;

	} // Fin generateCoordinates
};


/* Forma parte del patrón Strategy. Estrategia para generar coordenadas aleatorias de orientación diagonal */
let DiagonalRandomCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize, MAX_TRIES) {
		// Inicializamos un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Contador de intentos
		let tries = 0;

		// Bandera que detiene el bucle while durante la búsqueda de una nueva ubicación para un buque
		let isLocationValid = false;

		// Los buques en contradiagonal tienen una celda menos
		shipSize = shipSize - 1;

		// Mientras no se obtenga una ubicación válida ni se supere la cantidad máxima de intentos
		while (!isLocationValid && tries <= MAX_TRIES) {
			let row = Utilities.getRandomInt(board.boardXSize - shipSize);

			let col = Utilities.getRandomInt(board.boardYSize);

			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {
				if (tempBoardMatrix[row + i][col - i] == 0) {
					// La celda está libre
					newShipLocations.push({"row": (row + i), "column": (col - i)});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row + i][col - i] = DIAGONAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces tenemos una ubicación
			if (i == shipSize) {
				isLocationValid = true;

				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques diagonales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new DiagonalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);
			}
			else {
				// El intento de asignación aleatoria falló
				++tries;
			}

		}//fin while

		return newShipLocations;

	} // Fin generateCoordinates
};


/* Forma parte del patrón Strategy. Estrategia para generar coordenadas aleatorias de orientación contradiagonal */
let CounterDiagonalRandomCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize, MAX_TRIES) {
		// Inicializamos un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Contador de intentos
		let tries = 0;

		// Bandera que detiene el bucle while durante la búsqueda de una nueva ubicación para un buque
		let isLocationValid = false;

		// Los buques contradiagonales tienen una celda menos
		shipSize = shipSize - 1;

		// Mientras no se obtenga una ubicación válida ni se supere la cantidad máxima de intentos
		while (!isLocationValid && tries <= MAX_TRIES) {
			let row = Utilities.getRandomInt(board.boardXSize - shipSize);

			let col = Utilities.getRandomInt(board.boardYSize - shipSize);

			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {
				if (tempBoardMatrix[row + i][col + i] == 0) {
					// La celda está libre
					newShipLocations.push({"row": (row + i), "column": (col + i)});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row + i][col + i] = COUNTER_DIAGONAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces tenemos una ubicación
			if (i == shipSize) {
				isLocationValid = true;

				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques contradiagonales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new CounterDiagonalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);
			}
			else {
				// El intento de asignación aleatoria falló
				++tries;
			}

		}//fin while

		return newShipLocations;

	} // Fin generateCoordinates
};


/*	Forma parte del patrón Strategy.

	Retorna una posición para el barco dentro del tablero.

	Cada subestrategia de generateDirectShipCoordinates trata de asignar directamente una posición
	usando la orientación que ha fallado con la estrategia de posicionamiento aleatorio.
*/
Board.prototype.generateDirectShipCoordinates = function generateDirectShipCoordinates(shipSize, orientation) {
	// Asigna la estrategia de posicionamiento directo del buque
	switch (orientation) {
		case 0:
			this.coordinatesGenerator = new HorizontalDirectCoordinatesGenerator(this);

		break;

		case 1:
			this.coordinatesGenerator = new VerticalDirectCoordinatesGenerator(this);

		break;

		case 2:
			this.coordinatesGenerator = new DiagonalDirectCoordinatesGenerator(this);

		break;

		case 3:
			this.coordinatesGenerator = new CounterDiagonalDirectCoordinatesGenerator(this);

		break;

		default:
		break;
	}

	// Forma parte del patrón Strategy.
	// Ejecuta la estrategia de posicionamiento directo del buque
	let newShipLocations = this.generateCoordinates(shipSize);

	return newShipLocations;
}


/* Forma parte del patrón Strategy. Estrategia para asignar directamente coordenadas horizontales */
let HorizontalDirectCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize) {
		// 1. Por única vez se obtienen las posibles filas con 0's suficientes para posicionar un buque
		if (board.rowsWithEmptyCells == null) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			// Inicializamos board.rowsWithEmptyCells
			board.rowsWithEmptyCells = {};

			for (let row = 0; row < board.boardYSize; row++) {
				// Suma los 1's del tablero
				let sum = 0;

				for (let col = 0; col < board.boardXSize; col++) {
					// Suma los 1's en la horizontal
					sum += tempBoardMatrix[row][col];
				} // Fin for col

				// Cantidad de 0's en la fila
				let zerosInRow = board.boardXSize - sum;

				// ¿Hay espacio para meter horizontalmente un buque de "shipSize" cantidad de celdas en la fila "row"?
				if (zerosInRow >= shipSize) {
					// board.rowsWithEmptyCells guarda el número de la fila con la cantidad de 0's de la fila
					board.rowsWithEmptyCells[row] = zerosInRow;
				}

			} // Fin for row

		} // Fin if


		// 2. Se trata de posicionar un buque en alguna de las filas calculadas en el paso 1
		let newShipLocations = calculateShipLocations(shipSize);

		// Si no hay más posibilidades de ubicar un buque horizontalmente,
		// aún cuando se retorne una ubicación válida, se elimina la orientación horizontal
		if (Object.keys(board.rowsWithEmptyCells).length == 0) {
			board.banThisOrientation(HORIZONTAL);
		}

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateCoordinates


	function calculateShipLocations(shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Longitud de rowsWithEmptyCellsSize (cantidad de ceros)
		let rowsWithEmptyCellsSize = Object.keys(board.rowsWithEmptyCells).length;

		// Si hay suficientes celdas libres para meter un buque de "shipSize" cantidad de celdas horizontalmente
		if (rowsWithEmptyCellsSize > 0) {
			// Se prueba ubicar el buque directamente en alguna de las filas encontradas con celdas libres
			for (let row in board.rowsWithEmptyCells) {
				// Como row es una propiedad de un objeto, se debe convertir a entero
				row = parseInt(row);

				// Array con la ubicación del buque
				newShipLocations = generateRowLocations(row, shipSize);

				if (newShipLocations.length > 0) {
					// Si board.rowsWithEmptyCells[row] aún puede albergar otro buque, se actualiza su valor
					// si no, entonces eliminamos la posición de board.rowsWithEmptyCells
					if ((board.rowsWithEmptyCells[row] - shipSize) >= shipSize) {
						board.rowsWithEmptyCells[row] = board.rowsWithEmptyCells[row] - shipSize;
					}
					else {
						delete board.rowsWithEmptyCells[row];
					}

					// Se interrumpe el lazo for in row
					break;
				}
				else {
					// Si no se ha conseguido una ubicación válida, eliminamos la posición de board.rowsWithEmptyCells
					delete board.rowsWithEmptyCells[row];
				}

			} // Fin for in row

		} // Fin if

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin calculateShipLocations


	function generateRowLocations(row, shipSize) {
		// Array que contendrá las coordenadas del buque
		let newShipLocations = [];

		for (let col = 0; col <= board.boardXSize - shipSize; col++) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {
				if (tempBoardMatrix[row][col + i] == 0) {
					// La celda está libre
					newShipLocations.push({"row": row, "column": (col + i)});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row][col + i] = HORIZONTAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces se tiene una ubicación
			if (i == shipSize) {
				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques horizontales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new HorizontalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);

				// Se interrumpe el lazo for col
				break;
			}

		} // Fin for col

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateRowLocations

};


/* Forma parte del patrón Strategy. Estrategia para asignar directamente coordenadas verticales */
let VerticalDirectCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize) {
		// 1. Por única vez se obtienen las posibles columnas con 0's suficientes para posicionar un buque
		if (board.columnsWithEmptyCells == null) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			board.columnsWithEmptyCells = {};

			for (let col = 0; col < board.boardXSize; col++) {
				// Suma los 1's del tablero
				let sum = 0;

				 for (let row = 0; row < board.boardYSize; row++) {
					// Suma los 1's en la vertical
					sum += tempBoardMatrix[row][col];
				} // Fin for row

				// Cantidad de 0's en la columna
				let zerosInColumn = board.boardYSize - sum;

				// ¿Hay espacio para meter verticalmente un buque de "shipSize" cantidad de celdas en la columna "col"?
				if (zerosInColumn >= shipSize) {
					// board.columnsWithEmptyCells guarda el número de la columna con la cantidad de 0's de la columna
					board.columnsWithEmptyCells[col] = zerosInColumn;
				}

			} // Fin for col
		}


		// 2. Se trata de posicionar un buque en alguna de las columnas calculadas en el paso 1
 		let newShipLocations = calculateShipLocations(shipSize);

		// Si no hay más posibilidades de ubicar un buque verticalmente,
		// aún cuando se retorne una ubicación válida, se elimina la orientación vertical
		if (Object.keys(board.columnsWithEmptyCells).length == 0) {
			board.banThisOrientation(VERTICAL);
		}

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateCoordinates


	function calculateShipLocations(shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Longitud de columnsWithEmptyCellsSize (cantidad de ceros)
		let columnsWithEmptyCellsSize = Object.keys(board.columnsWithEmptyCells).length;

		// Si hay suficientes celdas libres para meter un buque de "shipSize" cantidad de celdas verticalmente
		if (columnsWithEmptyCellsSize > 0) {
			// Se prueba ubicar el buque directamente en alguna de las columnas encontradas con celdas libres
			for (let col in board.columnsWithEmptyCells) {
				// Como col es una propiedad de un objeto, se debe convertir a entero
				col = parseInt(col);

				// Array con la ubicación del buque
				newShipLocations = generateColumnLocations(col, shipSize);

				if (newShipLocations.length > 0) {
					// Si board.columnsWithEmptyCells[col] aún puede albergar otro buque, se actualiza su valor
					// si no, entonces eliminamos la posición de board.columnsWithEmptyCells
					if ((board.columnsWithEmptyCells[col] - shipSize) >= shipSize) {
						board.columnsWithEmptyCells[col] = board.columnsWithEmptyCells[col] - shipSize;
					}
					else {
						delete board.columnsWithEmptyCells[col]
					}

					// Se interrumpe el lazo for in col
					break;
				}
				else {
					// Si no se ha conseguido una ubicación válida, eliminamos la posición de board.columnsWithEmptyCells
					delete board.columnsWithEmptyCells[col];
				}

			}// Fin for in col

		}// Fin if

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin calculateShipLocations


	function generateColumnLocations(col, shipSize) {
		// Array que contendrá las coordenadas del buque
		let newShipLocations = [];

		for (let row = 0; row <= board.boardYSize - shipSize; row++) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {
				if (tempBoardMatrix[row + i][col] == 0) {
					// La celda está libre
					newShipLocations.push({"row": (row + i), "column": col});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row + i][col] = VERTICAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces tenemos una ubicación
			if (i == shipSize) {
				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques verticales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new VerticalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);

				// Se interrumpe el lazo for col
				break;
			}

		} // Fin for row

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateColumnLocations

};


/* Forma parte del patrón Strategy. Estrategia para asignar directamente coordenadas diagonales */
let DiagonalDirectCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize) {
		// Los buques en diagonal tienen una celda menos
		shipSize = shipSize - 1;

		// Por única vez se obtienen las posibles diagonales con 0's suficientes para posicionar un buque
		if (board.diagonalsWithEmptyCells == null) {
			calculateDiagonalsWithEmptyCells(shipSize)
		}

		// Se trata de posicionar un buque en alguna de las diagonales calculadas en los pasos 1.1 y 1.2
		let newShipLocations = calculateShipLocations(shipSize);

		// Si no hay más posibilidades de ubicar un buque contrdiagonalmente,
		// aún cuando se retorne una ubicación válida, se elimina la orientación diagonal
		let diagonalsWithEmptyCellsSize =
			Object.keys(board.diagonalsWithEmptyCells.upper).length +
			Object.keys(board.diagonalsWithEmptyCells.lower).length;

			if (diagonalsWithEmptyCellsSize == 0) {
				board.banThisOrientation(MAIN_DIAGONAL);
			}

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateCoordinates


	/* Se obtienen las posibles diagonales con 0's suficientes para posicionar un buque */
	function calculateDiagonalsWithEmptyCells(shipSize) {
		// Hacemos una copia del tablero
		let tempBoardMatrix = board.getBoard();

		/*
			Inicializamos board.diagonalsWithEmptyCells
			con board.diagonalsWithEmptyCells["upper"] que guardará el número de la columna
			con la cantidad de 0's de la diagonal;
			y board.diagonalsWithEmptyCells["lower"] que guardará el número de la fila
			con la cantidad de 0's de la diagonal
		*/
		board.diagonalsWithEmptyCells = {
			upper: {},
			lower: {}
		};

		// La última columna
		let lastColumn = board.boardXSize - 1;

		// La primera columna
		let firstColumn = board.boardXSize - shipSize;

		// 1. Cálculo de las diagonales por encima de la diagonal principal,
		// iterando sobre las columnas desde la fila 0 sólamente
		for (let col = lastColumn; col >= firstColumn; col--) {
			// Suma los 1's del tablero
			let sum = 0;

			// El largo de la diagonal se reduce en 1 a medida que se acerca al borde:
			let diagSize = board.boardDiagSize - (lastColumn - col);

			for (let i = 0; i < diagSize; i++) {
				// Suma los 1's en la diagonal
				sum += tempBoardMatrix[i][col - i];

			} // Fin for i

			// Los ceros en cada diagonal hacia la izquierda de la diagonal principal se calculan así:
			// el largo de cada diagonal diagSize menos la suma de 1's
			let zerosInUpperDiagonals = diagSize - sum;

			// ¿Hay espacio para meter diagonalmente (/) un buque de "shipSize" cantidad de celdas
			// en la diagonal que empieza en la fila 0 y columna "col"?
			if (zerosInUpperDiagonals >= shipSize) {
				board.diagonalsWithEmptyCells.upper[col] = zerosInUpperDiagonals;
			}

		} // Fin for col


		// 2. Cálculo de las diagonales por debajo de la diagonal principal,
		// iterando sobre las filas (desde la fila 1 porque arriba ya se calculó la fila 0),
		// desde la última columna (board.boardXSize) sólamente

		for (let row = 1; row <= board.boardYSize - shipSize; row++) {
			// Suma los 1's del tablero
			let sum = 0;

			// El largo de la diagonal se reduce en 1 a medida que se acerca al borde:
			let diagSize = board.boardDiagSize - row;

			for (let i = 0; i < diagSize; i++) {
				// Suma los 1's en la diagonal
				sum += tempBoardMatrix[row + i][lastColumn - i];

			} // Fin for i

			// Los ceros en cada diagonal por debajo de la diagonal principal se calculan así:
			// el largo de cada diagonal (boardDiagSize - diagSize) menos la suma de 1's
			let zerosInLowerDiagonals = diagSize - sum;

			// ¿Hay espacio para meter diagonalmente (/) un buque de "shipSize" cantidad de celdas
			// en la diagonal que empieza en la fila row y columna "lastColumn"?
			if (zerosInLowerDiagonals >= shipSize) {
				board.diagonalsWithEmptyCells.lower[row] = zerosInLowerDiagonals;
			}

		} // Fin for row

	} // Fin calculateDiagonalsWithEmptyCells


	function calculateShipLocations(shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Longitud de diagonalsWithEmptyCells (cantidad de ceros)
		let diagonalsWithEmptyCellsSize =
			Object.keys(board.diagonalsWithEmptyCells.upper).length +
			Object.keys(board.diagonalsWithEmptyCells.lower).length;

			// Si hay suficientes celdas libres para meter un buque de "shipSize" cantidad de celdas en diagonales
			// Se prueba ubicar el buque directamente en alguna de las diagonales encontradas con celdas libres
			if (diagonalsWithEmptyCellsSize > 0) {
				for (let col in board.diagonalsWithEmptyCells.upper) {
					// Como col es una propiedad de un objeto, se debe convertir a entero
					col = parseInt(col);

					// Array con la ubicación del buque
					newShipLocations = generateUpperDiagonalLocations(col, shipSize);

					if (newShipLocations.length > 0) {
						// Si board.diagonalsWithEmptyCells.upper[col] aún puede albergar otro buque se actualiza su valor
						// si no, entonces eliminamos la posición de board.diagonalsWithEmptyCells.upper
						if ((board.diagonalsWithEmptyCells.upper[col] - shipSize) >= shipSize) {
							board.diagonalsWithEmptyCells.upper[col] = board.diagonalsWithEmptyCells.upper[col] - shipSize;
						}
						else {
							delete board.diagonalsWithEmptyCells.upper[col];
						}

						// Se interrumpe el lazo for in row
						break;
					}
					else {
						// Si no se ha conseguido una ubicación válida
						// eliminamos la posición de board.diagonalsWithEmptyCells
						delete board.diagonalsWithEmptyCells.upper[col];
					}

				} // Fin for in col


				// Si se tiene una ubicación válida se retornan las coordenadas del buque
				if (newShipLocations.length) {
					return newShipLocations;
				}

				// Si aún no se tiene una ubicación válida, se continúa con las diagonales inferiores
				for (let row in board.diagonalsWithEmptyCells.lower) {
					// Como row es una propiedad de un objeto, se debe convertir a entero
					row = parseInt(row);

					// Array con la ubicación del buque
					newShipLocations = generateLowerDiagonalLocations(row, shipSize);

					if (newShipLocations.length > 0) {
						// Si board.diagonalsWithEmptyCells.lower[row] aún puede albergar otro buque se actualiza su valor
						// si no, entonces eliminamos la posición de board.diagonalsWithEmptyCells.lower
						if ((board.diagonalsWithEmptyCells.lower[row] - shipSize) >= shipSize) {
							board.diagonalsWithEmptyCells.lower[row] = board.diagonalsWithEmptyCells.lower[row] - shipSize;
						}
						else {
							delete board.diagonalsWithEmptyCells.lower[row];
						}

						// Se interrumpe el lazo for in row
						break;
					}
					else {
						// Si no se ha conseguido una ubicación válida, eliminamos la posición de board.diagonalsWithEmptyCells.lower
						delete board.diagonalsWithEmptyCells.lower[row];
					}

				} // Fin for in row

			} // Fin if diagonalsWithEmptyCells

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin calculateShipLocations


	function generateUpperDiagonalLocations(col, shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		for (let row = 0; row <= board.boardDiagSize - shipSize; row++) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {
				if (tempBoardMatrix[row + i][col - (row + i)] == 0) {
					// La celda está libre
					newShipLocations.push({"row": (row + i), "column": (col - (row + i))});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row + i][col - (row + i)] = DIAGONAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces se tiene una ubicación
			if (i == shipSize) {
				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques diagonales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new DiagonalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);

				// Se interrumpe el lazo for row
				break;
			}

		} // Fin for row

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateUpperDiagonalLocations


	function generateLowerDiagonalLocations(row, shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// La última columna
		let lastColumn = board.boardXSize - 1;

		// La primera columna
		let firstColumn = board.boardXSize - shipSize;

		// Cálculo de las diagonales por debajo de la diagonal principal,
		// iterando sobre las filas desde la última columna, desde la fila 1 porque ya se calculó la fila 0
		for (let col = lastColumn; col >= firstColumn; col--) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {

				if (tempBoardMatrix[row + i][col - i] == 0) {
					// La celda está libre
					newShipLocations.push({"row": (row + i), "column": (col - i)});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row + i][col - i] = DIAGONAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces se tiene una ubicación
			if (i == shipSize) {
				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques diagonales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new DiagonalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);

				// Se interrumpe el lazo for row
				break;
			}

		} // Fin for col

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateLowerDiagonalLocations

};


/* Forma parte del patrón Strategy. Estrategia para asignar directamente coordenadas contradiagonales */
let CounterDiagonalDirectCoordinatesGenerator = function(board) {
	this.generateCoordinates = function(shipSize) {
		// Los buques contradiagonales tienen una celda menos
		shipSize = shipSize - 1;

		// Por única vez se obtienen las posibles contradiagonales con 0's suficientes para posicionar un buque
		if (board.counterDiagonalsWithEmptyCells == null) {
			calculateCounterDiagonalsWithEmptyCells(shipSize);
		}

		// Se trata de posicionar un buque en alguna de las contradiagonales
		let newShipLocations = calculateShipLocations(shipSize);

		// Si no hay más posibilidades de ubicar un buque contradiagonalmente,
		// aún cuando se retorne una ubicación válida, se elimina la orientación contradiagonal
		let counterDiagonalsWithEmptyCellsSize =
			Object.keys(board.counterDiagonalsWithEmptyCells.upper).length +
			Object.keys(board.counterDiagonalsWithEmptyCells.lower).length;

		if (counterDiagonalsWithEmptyCellsSize == 0) {
			board.banThisOrientation(COUNTER_DIAGONAL);
		}

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateCoordinates


	/* Se obtienen las posibles contradiagonales con 0's suficientes para posicionar un buque */
	function calculateCounterDiagonalsWithEmptyCells(shipSize) {
		// Hacemos una copia del tablero
		let tempBoardMatrix = board.getBoard();

		/*
			Inicializamos board.counterDiagonalsWithEmptyCells
			con board.counterDiagonalsWithEmptyCells["upper"] que guardará el número de la columna
			con la cantidad de 0's de la contradiagonal;
			y board.counterDiagonalsWithEmptyCells["lower"] que guardará el número de la fila
			con la cantidad de 0's de la contradiagonal
		*/
		board.counterDiagonalsWithEmptyCells = {
			upper: {},
			lower: {}
		};

		// 1. Cálculo de las contradiagonales por encima de la contradiagonal principal,
		// iterando sobre las columnas desde la fila 0 sólamente

		for (let col = 0; col <= board.boardXSize - shipSize; col++) {
			// Suma los 1's del tablero
			let sum = 0;

			// El largo de la contradiagonal se reduce en 1 a medida que se acerca al borde:
			let diagSize = board.boardDiagSize - col;

			for (let i = 0; i < diagSize; i++) {
				// Suma los 1's en la contradiagonal
				sum += tempBoardMatrix[i][col + i];

			}// Fin for i

			// Los ceros en cada contradiagonal hacia la derecha de la contradiagonal principal se calculan así:
			// el largo de cada contradiagonal diagSize menos la suma de 1's
			let zerosInUpperCounterDiagonals = diagSize - sum;

			// ¿Hay espacio para meter contradiagonalmente (\) un buque de "shipSize" cantidad de celdas
			// en la contradiagonal que empieza en la fila 0 y columna "col"?
			if (zerosInUpperCounterDiagonals >= shipSize) {
				board.counterDiagonalsWithEmptyCells.upper[col] = zerosInUpperCounterDiagonals;
			}

		} // Fin for col


		// 2. Cálculo de las contradiagonales por debajo de la contradiagonal principal,
		// iterando sobre las filas (desde la fila 1 porque arriba ya se calculó la fila 0),
		// desde la columna 0 sólamente

		for (let row = 1; row <= board.boardYSize - shipSize; row++) {
			// Suma los 1's del tablero
			let sum = 0;

			// El largo de la contradiagonal se reduce en 1 a medida que se acerca al borde:
			let diagSize = board.boardDiagSize - row;

			for (let i = 0; i < diagSize; i++) {
				// Suma los 1's en la contradiagonal
				sum += tempBoardMatrix[row + i][i];

			} // Fin for i

			// Los ceros en cada contradiagonal por debajo de la contradiagonal principal se calculan así:
			// el largo de cada contradiagonal (boardDiagSize - diagSize) menos la suma de 1's
			let zerosInLowerCounterDiagonals = diagSize - sum;

			// ¿Hay espacio para meter contradiagonalmente (\) un buque de "shipSize" cantidad de celdas
			// en la contradiagonal que empieza en la fila "row" y columna 0?
			if (zerosInLowerCounterDiagonals >= shipSize) {
				board.counterDiagonalsWithEmptyCells.lower[row] = zerosInLowerCounterDiagonals;
			}

		} // Fin for row

	} // Fin calculateCounterDiagonalsWithEmptyCells


	function calculateShipLocations(shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		// Longitud de counterDiagonalsWithEmptyCells (cantidad de ceros)
		let counterDiagonalsWithEmptyCellsSize =
			Object.keys(board.counterDiagonalsWithEmptyCells.upper).length +
			Object.keys(board.counterDiagonalsWithEmptyCells.lower).length;

		// Si hay suficientes celdas libres para meter un buque de "shipSize" cantidad de celdas en contradiagonales
		// Se prueba ubicar el buque directamente en alguna de las contradiagonales encontradas con celdas libres
		if (counterDiagonalsWithEmptyCellsSize > 0) {
			for (let col in board.counterDiagonalsWithEmptyCells.upper) {
				// Como col es una propiedad de un objeto, se debe convertir a entero
				col = parseInt(col);

				// Array con la ubicación del buque
				newShipLocations = generateUpperCounterDiagonalLocations(col, shipSize);

				if (newShipLocations.length > 0) {
					// Si board.counterDiagonalsWithEmptyCells.upper[col] aún puede albergar otro buque se actualiza su valor
					// si no, entonces eliminamos la posición de board.counterDiagonalsWithEmptyCells.upper
					if ((board.counterDiagonalsWithEmptyCells.upper[col] - shipSize) >= shipSize) {
						board.counterDiagonalsWithEmptyCells.upper[col] = board.counterDiagonalsWithEmptyCells.upper[col] - shipSize;
					}
					else {
						delete board.counterDiagonalsWithEmptyCells.upper[col];
					}

					// Se interrumpe el lazo for in row
					break;
				}
				else {
					// Si no se ha conseguido una ubicación válida
					// eliminamos la posición de board.counterDiagonalsWithEmptyCells
					delete board.counterDiagonalsWithEmptyCells.upper[col];
				}

			} // Fin for in col


			// Si se tiene una ubicación válida se retornan las coordenadas del buque
			if (newShipLocations.length) {
				return newShipLocations;
			}

			// Si aún no se tiene una ubicación válida, se continúa con las contradiagonales inferiores
			for (let row in board.counterDiagonalsWithEmptyCells.lower) {
				// Como row es una propiedad de un objeto, se debe convertir a entero
				row = parseInt(row);

				// Array con la ubicación del buque
				newShipLocations = generateLowerCounterDiagonalLocations(row, shipSize);

				if (newShipLocations.length > 0) {
					// Si board.counterDiagonalsWithEmptyCells.lower[row] aún puede albergar otro buque se actualiza su valor
					// si no, entonces eliminamos la posición de board.counterDiagonalsWithEmptyCells.lower
					if ((board.counterDiagonalsWithEmptyCells.lower[row] - shipSize) >= shipSize) {
						board.counterDiagonalsWithEmptyCells.lower[row] = board.counterDiagonalsWithEmptyCells.lower[row] - shipSize;
					}
					else {
						delete board.counterDiagonalsWithEmptyCells.lower[row];
					}

					// Se interrumpe el lazo for in row
					break;
				}
				else {
					// Si no se ha conseguido una ubicación válida, eliminamos la posición de board.counterDiagonalsWithEmptyCells.lower
					delete board.counterDiagonalsWithEmptyCells.lower[row];
				}

			} // Fin for in row

		} // Fin if counterDiagonalsWithEmptyCells

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin calculateShipLocations


	function generateUpperCounterDiagonalLocations(col, shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		for (let row = 0; row <= board.boardDiagSize - shipSize; row++) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {
				if (tempBoardMatrix[row + i][(row + col) + i] == 0) {
					// La celda está libre
					newShipLocations.push({"row": (row + i), "column": ((row + col) + i)});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[row + i][(row + col) + i] = COUNTER_DIAGONAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces se tiene una ubicación
			if (i == shipSize) {
				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques contradiagonales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new CounterDiagonalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);

				// Se interrumpe el lazo for row
				break;
			}

		} // Fin for row

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateUpperCounterDiagonalLocations


	function generateLowerCounterDiagonalLocations(row, shipSize) {
		// Se inicializa un array que contendrá las coordenadas del buque
		let newShipLocations = [];

		for (let col = 0; col <= board.boardDiagSize - shipSize; col++) {
			// Hacemos una copia del tablero
			let tempBoardMatrix = board.getBoard();

			for (var i = 0; i < shipSize; i++) {

				if (tempBoardMatrix[(row) + i][col + i] == 0) {
					// La celda está libre
					newShipLocations.push({"row": ((row + col) + i), "column": (col + i)});

					// La celda se marca para que no pueda ser ocupada por otro buque
					tempBoardMatrix[(row) + i][col + i] = COUNTER_DIAGONAL_MARK + i;
				}
				else {
					// Si la celda ya está ocupada eliminamos la ubicación temporaria del buque
					newShipLocations.length = 0;

					break;
				}

			} // Fin for i


			// Si el bucle for terminó con éxito, entonces se tiene una ubicación
			if (i == shipSize) {
				// Cargamos en el tablero el nuevo buque
				board.boardMatrix = tempBoardMatrix;

				/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques contradiagonales para que no puedan ser ocupadas por otros buques */
				board.cellsMarker = new CounterDiagonalMarker();

				// Cargamos en el tablero las celdas del nuevo buque
				board.boardMatrix = board.markCellsAround(tempBoardMatrix, row, col, shipSize);

				// Se interrumpe el lazo for row
				break;
			}

		} // Fin for col

		// Retorna las coordenadas
		return newShipLocations;

	} // Fin generateLowerCounterDiagonalLocations

};


/*	Façade que implementa un patrón Strategy.
	Marca las celdas alrededor de los buques usando una estrategia particular
	para cada tipo de buque
*/
Board.prototype.markCellsAround = function markCellsAround(tempBoardMatrix, row, column, shipSize) {

	return this.cellsMarker.markCellsAround(tempBoardMatrix, row, column, shipSize);
}


/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques horizontales */
let HorizontalMarker = function HorizontalMarker() {

	this.markCellsAround = function markCellsAround(tempBoardMatrix, row, column, shipSize) {

		if (typeof tempBoardMatrix[row - 1] != "undefined") {
			for (let col = column; col < column + shipSize; ++col) {
				if (tempBoardMatrix[row - 1][col] == 0) {
					tempBoardMatrix[row - 1][col] = CELL_MARK;
				}
			}
		}

		if (typeof tempBoardMatrix[row + 1] != "undefined") {
			for (let col = column; col < column + shipSize; ++col) {
				if (tempBoardMatrix[row + 1][col] == 0) {
					tempBoardMatrix[row + 1][col] = CELL_MARK;
				}
			}
		}

		// Retornamos el tablero con las celdas marcadas
		return tempBoardMatrix;
	}

}; // Fin HorizontalMarker


/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques verticales */
let VerticalMarker = function VerticalMarker() {

	this.markCellsAround = function markCellsAround(tempBoardMatrix, row, column, shipSize) {

		if (typeof tempBoardMatrix[row][column + 1] != "undefined") {
			for (let r = row; r < (row + shipSize); ++r) {
				if (tempBoardMatrix[r][column + 1] == 0) {
					tempBoardMatrix[r][column + 1] = CELL_MARK;
				}
			}
		}

		if (typeof tempBoardMatrix[row][column - 1] != "undefined") {
			for (let r = row; r < (row + shipSize); ++r) {
				if (tempBoardMatrix[r][column - 1] == 0) {
					tempBoardMatrix[r][column - 1] = CELL_MARK;
				}
			}
		}

		// Retornamos el tablero con las celdas marcadas
		return tempBoardMatrix;
	}

}; // Fin VerticalMarker


/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques en diagonal */
let DiagonalMarker = function DiagonalMarker() {

	this.markCellsAround = function markCellsAround(tempBoardMatrix, row, column, shipSize) {
		// Se marca la fila de arriba
		if (typeof tempBoardMatrix[row - 1] != "undefined") {
			for (let col = (column - shipSize); col < (column + shipSize - 1); ++col) {
				if (tempBoardMatrix[row - 1][col] == 0) {
					tempBoardMatrix[row - 1][col] = CELL_MARK;
				}
			}
		}

		// Se marca la fila de abajo
		if (typeof tempBoardMatrix[row + shipSize] != "undefined") {
			for (let col = (column - shipSize); col < (column + shipSize - 1); ++col) {
				if (tempBoardMatrix[row + shipSize][col] == 0) {
					tempBoardMatrix[row + shipSize][col] = CELL_MARK;
				}
			}
		}

		// Se marca la columna de la derecha
		if (typeof tempBoardMatrix[row][column + 1] != "undefined") {
			for (let r = row; r <= (row + shipSize); ++r) {
				if (tempBoardMatrix[r][column + 1] == 0) {
					tempBoardMatrix[r][column + 1] = CELL_MARK;
				}
			}
		}

		// Se marca la columna de la izquierda
		if (typeof tempBoardMatrix[row][column - shipSize] != "undefined") {
			for (let r = row; r <= (row + shipSize); ++r) {
				if (tempBoardMatrix[r][column - shipSize] == 0) {
					tempBoardMatrix[r][column - shipSize] = CELL_MARK;
				}
			}
		}

		// Retornamos el tablero con las celdas marcadas
		return tempBoardMatrix;
	}

}; // Fin DiagonalMarker


/* Forma parte del patrón Strategy. Marca las celdas alrededor de los buques diagonales */
let CounterDiagonalMarker = function CounterDiagonalMarker() {

	this.markCellsAround = function markCellsAround(tempBoardMatrix, row, column, shipSize) {
		// Se marca la fila de arriba
		if (typeof tempBoardMatrix[row - 1] != "undefined") {
			for (let col = column; col <= (column + shipSize); ++col) {
				if (tempBoardMatrix[row - 1][col] == 0) {
					tempBoardMatrix[row - 1][col] = CELL_MARK;
				}
			}
		}

		// Se marca la fila de abajo
		if (typeof tempBoardMatrix[row + shipSize] != "undefined") {
			for (let col = column; col <= (column + shipSize); ++col) {
				if (tempBoardMatrix[row + shipSize][col] == 0) {
					tempBoardMatrix[row + shipSize][col] = CELL_MARK;
				}
			}
		}

		// Se marca la columna de la derecha
		if (typeof tempBoardMatrix[row][column] != "undefined") {
			for (let r = row; r <= (row + shipSize - 1); ++r) {
				if (tempBoardMatrix[r][column] == 0) {
					tempBoardMatrix[r][column] = CELL_MARK;
				}
			}
		}

		// Se marca la columna de la izquierda
		if (typeof tempBoardMatrix[row][column + shipSize] != "undefined") {
			for (let r = row; r < (row + shipSize); ++r) {
				if (tempBoardMatrix[r][column + shipSize] == 0) {
					tempBoardMatrix[r][column + shipSize] = CELL_MARK;
				}
			}
		}

		// Retornamos el tablero con las celdas marcadas
		return tempBoardMatrix;
	}

}; // Fin CounterDiagonalMarker


/* Dibuja el tablero */
Board.prototype.display = function display(boardName) {

	let radar = document.querySelector(`#${boardName} > div.radar`);

	let radarFrag = document.createDocumentFragment();

	for (let row = 0; row < this.boardYSize; ++row) {

		let radarRow = document.createElement("div");

		radarRow.classList.add("row");

		for (let col = 0; col < this.boardXSize; ++col) {

			let cell = document.createElement("div");

			cell.classList.add("cell");

			cell.style.width = this.cellPixelsWidth + "px";

			cell.style.height = this.cellPixelsHeight + "px";

			cell.id = `cell_${row}_${col}`;

			radarRow.appendChild(cell);
		}

		radarFrag.appendChild(radarRow);
	}

	radar.appendChild(radarFrag);

} // Fin display
