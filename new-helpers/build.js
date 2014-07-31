'use strict';

var parse = require('./parse.js'),
    patterns = require('./patterns.js'),
    time = require('./time.js'),
    sortBy = require('./sortby.js'),
    fs = require('fs-extra'),
    path = require('path'),
    yaml = require('js-yaml');

var loadSections = function () {
  return yaml.safeLoad(fs.readFileSync('./config/sections.yml', 'utf8'));
}

//////////////////////////////
// Build the File listing
//////////////////////////////
var buildFileJSON = function (directory, cb) {
  var start = process.hrtime(),
      sections = Object.keys(loadSections());

  parse.files(directory, function (files) {
    var output = {};

    // Create an array for each section
    sections.forEach(function (section) {
      output[section] = [];
    });

    // console.log(output);

    // Loop over each file and push its pattern into the section
    files.forEach(function (file) {
      if (path.extname(file) === '.html') {
        var pattern = patterns.info(file),
            section = pattern.section;

        // console.log(section);
        // Push the pattern into the correct section
        output[section].push(pattern);
      }
    });

    // Display elapsed time
    time.elapsed(start, 'build.fileJSON');
    return cb(output);
  });
}

//////////////////////////////
// Build the Menu
//////////////////////////////
var buildMenuJSON = function (directory, cb) {
  var start = process.hrtime(),
      sections = loadSections(),
      folderHolder = {},
      folderReverse = {},
      folderSort = {},
      output = [];

  // Get the files and folders
  parse.folders(directory, function (folders) {

    // Builds basic folder information
    folders.forEach(function (v) {

      var pattern = patterns.info(v);
      var id = pattern.id;
      var group = pattern.group;
      if (pattern.section !== pattern.id) {
        id = pattern.section + '-' + pattern.id
        group = pattern.section;
        if (pattern.group !== '') {
          group +=  '-' + pattern.group;
        }
      }

      folderHolder[id] = {
        title: pattern.title,
        group: group,
        submenu: [],
        all: []
      };

      if (pattern.section === pattern.id) {
        folderHolder[id].all.push({
          title: 'View All',
          href: '#/' + pattern.id
        });
      }
      // If we're in a subsection, make sure it's prefixed
      else {
        folderHolder[id].all.push({
          title: 'View All',
          href: '#/' + pattern.section + '?group=' + pattern.id
        });
      }
    });


    parse.files(directory, function (files) {

      // Sorts files into their groups
      files.forEach(function (v) {
        var pattern = patterns.info(v);
        var item = {
          title: pattern.title,
          href: '#/' + pattern.section + '?id=' + pattern.id
        }

        if (pattern.group === '') {
          folderHolder[pattern.section].submenu.push(item);
        }
        else {
          folderHolder[pattern.section + '-' + pattern.group].submenu.push(item);
        }
      });


      // console.log(folderHolder);
      // Grab the core groups
      for (var k in folderHolder) {
        var folder = folderHolder[k];
        var group = folder.group;

        if (folder.group === '') {
          folder.title = sections[k].title;
          folderSort[k] = folder;
          delete folderHolder[k];
        }
      }
      // Reverse the remaining
      var reverseKeys = Object.keys(folderHolder).reverse();
      reverseKeys.forEach(function (v) {
        folderReverse[v] = folderHolder[v];
      });

      // Deep Nested Items
      for (var k in folderReverse) {
        var folder = folderReverse[k];
        var group = folder.group;

        if (folderReverse[group]) {
          folderReverse[group].submenu.push({
            title: folder.title,
            submenu: folder.submenu.sort(function (a, b) {
              return sortBy.title(a, b);
            }).concat(folder.all)
          });
          delete folderReverse[k];
        }
      }

      // First Level Items (below core folders)
      for (var k in folderReverse) {
        var folder = folderReverse[k];
        var group = folder.group;

        if (folderSort[group]) {
          folderSort[group].submenu.push({
            title: folder.title,
            submenu: folder.submenu.sort(function (a, b) {
              return sortBy.title(a, b);
            }).concat(folder.all)
          });
        }
      }

      // Core folders
      for (var k in folderSort) {
        var folder = folderSort[k];

        if (folder.submenu.length) {
          output.push({
            title: folder.title,
            submenu: folder.submenu.sort(function (a, b) {
              return sortBy.title(a, b);
            }).concat(folder.all)
          })  ;
        }
      }

      time.elapsed(start, 'build.menuJSON');
      return cb(output);
    });
  });
}

//////////////////////////////
// Build Scope JSON
//////////////////////////////
var buildScopeJSON = function (cb) {
  var start = process.hrtime(),
      sections = loadSections(),
      scopes = {};

  Object.keys(sections).forEach(function (v) {
    fs.existsSync
    var path = './' + v + '/' + v +'.yml';
    if (fs.existsSync(path)) {
      var load = yaml.safeLoad(fs.readFileSync('./' + v + '/' + v +'.yml', 'utf8'));
      if (load[v] !== undefined) {
        scopes[v] = load[v];
      }
    }
  });

  time.elapsed(start, 'build.scopeJSON');
  return cb(scopes);
}

//////////////////////////////
// Exports
//////////////////////////////
module.exports.loadSections = loadSections;
module.exports.fileJSON = buildFileJSON;
module.exports.menuJSON = buildMenuJSON;
module.exports.scopeJSON = buildScopeJSON;
