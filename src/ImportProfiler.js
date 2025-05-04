import debug from 'debug'

const debugImport = debug('app:profiler:imports')

/**
 * Class for profiling and tracking module import times
 */
class ImportProfiler {
  /**
   * Creates a new ImportProfiler instance
   * @param {string} relativePathFromPackage - The relative path from the package root
   */
  constructor(callerFile, relativePathFromCallerPackage) {
    this.callerFile = callerFile
    this.relativePathFromCallerPackage = relativePathFromCallerPackage
    this.imports = new Map()
    this.startTime = process.hrtime.bigint()
    this.lastImport = null
    this.lastTotalTime = 0  // Add this to track previous total
  }

  /**
   * Track the import time for a module
   * @param {string} moduleName - Name/path of the imported module
   * @param {number} importTime - Time taken to import the module in milliseconds
   */
  trackImport(moduleName, importTime) {
    this.imports.set(moduleName, importTime)
    this.lastImport = { moduleName, importTime }
  }

  /**
   * Summarize and log the import timing information
   * Calculates total time, time differences and discrepancies between imports
   * Logs detailed timing information using debug
   */
  summarize() {
    const totalTime = Number(process.hrtime.bigint() - this.startTime) / 1e6
    
    if (this.lastImport) {    
      // Colorize import time if it's greater than 1 second
      const importTimeStr = this.lastImport.importTime >= 1000  
        ? `\x1b[31m${this.lastImport.importTime.toFixed(2)}\x1b[0m` 
        : this.lastImport.importTime.toFixed(2)
      
      debugImport(`[${this.lastImport.moduleName}] (importTime: ${importTimeStr}ms)`)

      this.lastTotalTime = totalTime
    }
  }
}

export default ImportProfiler
