import profileImport from "../../src/profileImport";
// Minimal test
// Restore complex fixture

// Marker before the function
async function loadModule1() {
	const module = await profileImport('./module1.js', import.meta.url, null, '__AUTO_PROFILE__');
	module.doThing();
}

// No marker before this function
class MyClass {
	async loadModule2() {
		const module = await profileImport('../utils/module2.js', import.meta.url, null, '__AUTO_PROFILE__');
		return new module.Thing();
	}
}

// Dynamic import with non-string literal (should be ignored)
async function loadModule3(path) {
	const module = await import(path);
	return module;
}

// Already wrapped import (should be ignored, marker doesn't matter here)
import existingProfileImport from '../../src/profileImport.js';
async function loadModule4() {
	const module = await profileImport('./module4.js', import.meta.url, null, '__AUTO_PROFILE__');
	module.init();
}