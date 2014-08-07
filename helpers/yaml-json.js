'use strict';
var es = require('event-stream'),
    gutil = require('gulp-util'),
    yaml = require('yamljs'),
    path = require('path');

module.exports = function (options) {
  return es.map(function (gulpFile, cb) {
    if (gutil.isBuffer(gulpFile._contents)) {
      if (path.extname(gulpFile.path) === '.yml' || path.extname(gulpFile.path) === '.yaml') {
        var basePath = gulpFile.path;
        var newPath = gutil.replaceExtension(gulpFile.path, '.json');

        gulpFile._contents = new Buffer(JSON.stringify(yaml.parse(gulpFile._contents.toString('utf-8'))));
        gulpFile.path = newPath;
        gutil.log('Converted ' + gutil.colors.magenta(basePath.replace(gulpFile.base, '')) + ' to ' + gutil.colors.magenta(newPath.replace(gulpFile.base, '')));
      }
    }
    return cb(null, gulpFile);
  });
}
