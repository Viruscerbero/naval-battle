"use strict";

if (typeof Utilities === "undefined") {
	var Utilities = {};
}


/* Genera un número aleatorio entre 0 y max - 1 */
Utilities.getRandomInt = function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}


/* Crea un hash */
Utilities.hashCode = function hashCode(str) {
	let hash = 0;

	if (str.length == 0) return hash;

	for (let i = 0; i < str.length; i++) {
		let char = str.charCodeAt(i);

		hash = ((hash << 5) - hash) + char;

		hash = hash & hash; // Convert to 32bit integer
	}

	return hash.toString(16);
}
