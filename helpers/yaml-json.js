'use strict';
var es = require('event-stream');
var gutil = require('gulp-util');
var yaml = require('js-yaml');
var jf = require('jsonfile');
var chalk = require('chalk');
var _s = require('underscore.string');

module.exports.yaml2json = function (options) {
  return es.map(function (gulpFile, cb) {
    if (gutil.isBuffer(gulpFile._contents)) {
      if (_s.endsWith(gulpFile.path, '.yml') || _s.endsWith(gulpFile.path, '.yaml')) {
        var basePath = gulpFile.path;
        var newPath = gutil.replaceExtension(gulpFile.path, '.json');

        gulpFile._contents = new Buffer(JSON.stringify(yaml.safeLoad(gulpFile._contents.toString('utf-8'))));
        gulpFile.path = newPath;
        gutil.log('Converted ' + chalk.magenta(basePath.replace(gulpFile.base, '')) + ' to ' + chalk.magenta(newPath.replace(gulpFile.base, '')));
      }
    }
    return cb(null, gulpFile);
  });
}