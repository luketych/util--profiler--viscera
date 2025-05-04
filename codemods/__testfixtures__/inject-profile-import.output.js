// /Users/luketych/Dev/_util/profiler/viscera/codemods/__testfixtures__/inject-profile-import.output.js
import profileImport from '../../src/profileImport'; // Added by codemod

// @viscera-profile-import
async function loadModule1() {
	const module = await profileImport('./module1.js', import.meta.url, null, '__AUTO_PROFILE__'); // WRAPPED
	module.doThing();
}

// No marker here
class MyClass {
	async loadModule2() {
		const module = await profileImport('../utils/module2.js', import.meta.url, null, '__AUTO_PROFILE__'); // NOW WRAPPED
		return new module.Thing();
	}
}

// Dynamic import with non-string literal (should be ignored - remains unchanged)
async function loadModule3(path) {
	const module = await import(path);
	return module;
}

// Already wrapped import (should be ignored - remains unchanged)
// @viscera-profile-import
import existingProfileImport from '../../src/profileImport.js';
async function loadModule4() {
	const module = await existingProfileImport('./module4.js', import.meta.url, null, '__AUTO_PROFILE__');
	module.init();
}
