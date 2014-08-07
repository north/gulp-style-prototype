'use strict';

var gutil = require('gulp-util');

//////////////////////////////
// Gulp Log Elapsed Time
//////////////////////////////
var elapsed = function (start, fnc) {
  var precision = 2; // 3 decimal places
  var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  gutil.log("Finished '" + gutil.colors.cyan(fnc) + "' after " + gutil.colors.magenta(elapsed.toFixed(precision) + ' ms'));
}

//////////////////////////////
// Exports
//////////////////////////////
module.exports.elapsed = elapsed;