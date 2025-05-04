import getPackageJSONasObj from "./getPackageJSONasObj.js"


/**
 * Returns the package name from the package.json file.
 * For non-scoped packages, returns the full name (e.g. "util")
 * For scoped packages, returns just the package name without the scope (e.g. "@ktr-srt/util" => "util")
 * 
 * If no pkgJSONobj is passed, it will get the package.json file from the provided dirname.
 * 
 * @param {Object} options - The options object
 * @param {Object} [options.pkgJSONobj] - Optional package.json contents as an object
 * @param {string} [options.dirname] - Directory path containing package.json, required if pkgJSONobj not provided
 * @returns {Promise<string>} The package name
 * @throws {Error} If neither pkgJSONobj nor dirname is provided
 */
export default async function getPackageName({ pkgJSONobj, dirname }) {
    if (!pkgJSONobj && !dirname) {
        throw new Error("Either pkgJSONobj or dirname must be provided")
    }

    const _pkgJSONobj = pkgJSONobj || await getPackageJSONasObj(dirname)

    if (!_pkgJSONobj.name) {
        throw new Error("Package.json is missing the required 'name' field")
    }

    const nameArr = _pkgJSONobj.name.split('/')

    if (nameArr.length === 1) {
        return nameArr[0]
    }

    return nameArr.at(-1)
}