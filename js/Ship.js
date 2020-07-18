"use strict";

// A nivel global, las variables declaradas con "let" no crean propiedades en el objeto global (window).

const DIRECTORY_PATH = "ships/";
const EXTENSION_TYPE = ".png";
const WARSHIP_MODEL_EEL = "warship_eel";
const WARSHIP_MODEL_SHARK = "warship_shark";
const HORIZONTAL_LEFT = "_hl";
const HORIZONTAL_RIGHT = "_hr";
const VERTICAL_UP = "_vu";
const VERTICAL_DOWN = "_vd";
const DIAGONAL_UP = "_du";
const DIAGONAL_DOWN = "_dd";
const COUNTER_DIAGONAL_UP = "_cdu";
const COUNTER_DIAGONAL_DOWN = "_cdd";
const MIN_SHIP_SIZE = 3;
const MAX_SHIP_SIZE = 6;
const AMMUNITION = 50;


// Constructor "abstracto" del objeto del buque. No puede instanciarse directamente con new Ship().
function Ship(location, orientation) {

	if (this.constructor === Ship) {
		alert("Error al crear buque. Ship no se debe instanciar directamente, es un constructor abstracto.");

		throw new Error("Error al crear buque. Ship no se debe instanciar directamente, es un constructor abstracto.");
	}

	// Scope-Safe Constructor
	if (!(this instanceof Ship)) {
		return new Ship(location, orientation);
	}

	// Rechazamos números no enteros y que sean menores que el mímimo o mayores que el máximo
	let isValidShipSize = (location.length >= MIN_SHIP_SIZE) && (location.length <= MAX_SHIP_SIZE);

	if (!isValidShipSize) {
		alert("Error al crear buque");

		throw new Error("Error al crear buque");
	}

	this.location = location;

	this.shipLength = location.length;

	this.transform = transform(orientation, this.shipLength);

	this.damage = new Array(location.length).fill(0);

	this.missiles = AMMUNITION;

}// fin Ship


// Constructor del buque EelWarship
function EelWarship(location, orientation) {

	Ship.call(this, location, orientation);

	let direction = setDirection(orientation);

	this.model = `${DIRECTORY_PATH}${WARSHIP_MODEL_EEL}${direction}${EXTENSION_TYPE}`;
}
// Permite que EelWarship herede los métodos que Ship tiene en su prototype,
// pero causa que el constructor del prototype de EelWarship sea igual a Ship()
EelWarship.prototype = Object.create(Ship.prototype);
// Asigna el constructor del prototype de EelWarship a EelWarship()
Object.defineProperty(
	EelWarship.prototype,
	'constructor',
	{
		value: EelWarship,
		enumerable: false, // Para que no aparezca en bucles "for in"
		writable: true
	}
);


// Constructor del buque SharkWarship
function SharkWarship(location, orientation) {

	Ship.call(this, location, orientation);

	let direction = setDirection(orientation);

	this.model = `${DIRECTORY_PATH}${WARSHIP_MODEL_SHARK}${direction}${EXTENSION_TYPE}`;
}
// Permite que SharkWarship herede los métodos que Ship tiene en su prototype,
// pero causa que el constructor del prototype de SharkWarship sea igual a Ship()
SharkWarship.prototype = Object.create(Ship.prototype);
// Asigna el constructor del prototype de SharkWarship a SharkWarship()
Object.defineProperty(
	SharkWarship.prototype,
	'constructor',
	{
		value: SharkWarship,
		enumerable: false, // Para que no aparezca en bucles "for in"
		writable: true
	}
);


/* Crea una orientación completa del buque en el tablero componiendo un string de dos dígitos:
*  el primer dígito es un entero entre 0 y 3 para las cuatro direcciones,
*  y el segundo dígito un entero entre 0 y 1, generado al azar, para la orientación
*  (arriba - abajo / derecha - izquierda) según el caso
*/
let setDirection = function setDirection(orientation) {

	let direction = orientation + "" + Utilities.getRandomInt(2);

	switch (direction) {
		case "00":
			return HORIZONTAL_LEFT;
		break;

		case "01":
			return HORIZONTAL_RIGHT;
		break;

		case "10":
			return VERTICAL_UP;
		break;

		case "11":
			return VERTICAL_DOWN;
		break;

		case "20":
			return DIAGONAL_UP;
		break;

		case "21":
			return DIAGONAL_DOWN;
		break;

		case "30":
			return COUNTER_DIAGONAL_UP;
		break;

		case "31":
			return COUNTER_DIAGONAL_DOWN;
		break;

		default:
			alert("Error al crear buque");

			throw new Error("Error al crear buque");
	}
};


/* Determina las escalas en ancho y alto del sprite del buque, además, en el caso del buque diagonal,
 * translada hacia la izquierda una cantidad de píxeles igual al doble del ancho de una celda
 */
let transform = function transform(orientation, shipLength) {

	// shipLength es la longitud del buque en celdas.
	// Reference es 1.20 (corresponde al 120% del ancho o alto de una celda) para compensar
	// el estrechamiento de la imagen al escalarse según el ancho de las celdas
	const Reference = 1.20;

	switch (orientation) {
		case HORIZONTAL:
			return {"scaleWidth": shipLength, "scaleHeight": Reference};
		break;

		case VERTICAL:
			return {"scaleWidth": Reference, "scaleHeight": shipLength};
		break;

		case MAIN_DIAGONAL:
			// Los buques diagonales tienen una celda menos, (por lo tanto shipLength está reducido en 1),
			// y además deben ser trasladados dos celdas hacia la izquierda
			let translatedX = -(shipLength - 1);

			return {"scaleWidth": shipLength, "scaleHeight": shipLength, "translateX": translatedX};
		break;

		// Los buques diagonales tienen una celda menos, (por lo tanto shipLength está reducido en 1)
		case COUNTER_DIAGONAL:
			return {"scaleWidth": shipLength, "scaleHeight": shipLength};
	}
};


Ship.prototype.display = function display(mapCell) {

	/* row y col son las coordenadas de la primera celda,
	 * (de arriba hacia abajo y de derecha a izquierda), que ocupa el buque
	 */
	let row = this.location[0].row;

	let col = this.location[0].column;

	let shipImg = document.createElement("img");

	shipImg.src = this.model;

	// Se quita "px" de mapCell.style.width y de mapCell.style.height
	// y la cadena resultante se convierte a entero
	let mapCellWidth = parseInt(mapCell.style.width.replace(/[^\d]/g, ""));

	let mapCellHeight = parseInt(mapCell.style.height.replace(/[^\d]/g, ""));

	// Escala el sprite según las dimensiones de la celda
	shipImg.style.width = `${this.transform.scaleWidth * mapCellWidth}px`;

	shipImg.style.height = `${this.transform.scaleHeight * mapCellHeight}px`;

	// En el caso de los buques diagonales, el sprite debe desplazarse hacia la izquierda
	if (this.transform.translateX) {
		shipImg.style.transform =
		`translateX(${this.transform.translateX * mapCellWidth}px)`;
	}

	mapCell.classList.add("occupied");

	mapCell.appendChild(shipImg);

} // Fin display
