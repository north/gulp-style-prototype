'use strict';

var _s = require('underscore.string'),
    path = require('path');

//////////////////////////////
// Titleize File Name
//////////////////////////////
var titleizeFile = function (name) {
  return _s.titleize(name.replace('--', ' - ').replace('__', '- '));
}

//////////////////////////////
// Build Pattern Information
//////////////////////////////
var buildPatternInfo = function (file) {
  var ext = path.extname(file);
  // Do the initial split
  var position = process.cwd();
  if (position.charAt(0) === '/' && file.charAt(0) !== '/') {
    position = position.substr(1);
  }

  var split = file.replace(position + '/', '').split('/');
  // Section will be first item
  var section = split[0];
  // Group is path minus filename
  var group = split.slice(1, split.length - 1).join('-');
  // Name is filename without extension
  var name = split[split.length - 1].replace(ext, '');
  // Title is cleaned up, titelized name
  var title = titleizeFile(name);
  // ID is group plus name for files, full name for folders
  var id = (group === '') ? name : (ext === '') ? group + '-' + name : group + '--' + name;

  var pattern = {
    "section": section,
    "name": name,
    "title": title,
    "id": id,
    "path": 'partials/' + file,
    "group": group
  }
  return pattern;
}

//////////////////////////////
// Exports
//////////////////////////////
module.exports.titleize = titleizeFile;
module.exports.info = buildPatternInfo;
