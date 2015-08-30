'use strict';

//////////////////////////////
// Node Dependencies
//////////////////////////////
var fs = require('fs-extra'),
    rimraf = require('rimraf'),
    path = require('path'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    dirs = require('compass-options').dirs(),
    cache = require('gulp-cached'),
    shell = require('gulp-shell'),
    browserSync = require('browser-sync'),
    reload = browserSync.reload,
    execute = require('child_process').exec,
    sequence = require('run-sequence'),
    yaml = require('yamljs'),
    usemin = require('gulp-usemin'),
    uglify = require('gulp-uglify'),
    minifyCSS = require('gulp-minify-css'),
    rev = require('gulp-rev'),
    imagemin = require('gulp-imagemin'),
    pngcrush = require('imagemin-pngcrush'),
    subtree = require('gulp-subtree'),
    exec = require('child_process').exec,
    argv = require('yargs').argv,
    gutil = require('gulp-util');

//////////////////////////////
// Helpers
//////////////////////////////
var build = require('./helpers/build.js'),
    parse = require('./helpers/parse.js'),
    patterns = require('./helpers/patterns.js'),
    sortBy = require('./helpers/sortby.js'),
    time = require('./helpers/time.js'),
    yamlJSON = require('./helpers/yaml-json.js');

//////////////////////////////
// Exports
//////////////////////////////
module.exports = function (gulp) {
  //////////////////////////////
  // Setup Variables
  //////////////////////////////
  var sp__deploy = yaml.load('./config/deploy.yml'),
      sp__deployDefaults = {
        remote: 'origin',
        branch: 'gh-pages',
        message: 'Style Prototype Deploy',
        export: 'export',
        zip: false
      },
    sp__sectionsConfig = build.loadSections(),
    sp__sections = Object.keys(sp__sectionsConfig),
    sp__paths = {
      server: '.www/',
      js: dirs.js + '/**/*.js',
      img: dirs.img + '/**/*',
      fonts: dirs.fonts + '/**/*',
      sass: dirs.sass + '/**/*',
      css: dirs.css + '/**/*.css',
      demos: 'demos',
      pages: 'demos/pages',
      index: 'index.html',
      dist: '.dist/',
      components: [],
      scopes: [],
      configFile: 'config/files.json',
      configMenu: 'config/menu.json',
      configScope: 'config/scopes.json',
      configPages: 'config/pages.json'
    },
    i;

  sp__sections.forEach(function (v, k) {
    sp__paths.scopes.push(v + '/' + v + '.json');
    sp__paths.components.push(v + '/**/*');
  });

  sp__paths.partials = sp__paths.server + 'partials/';


  // Deploy Defaults
  if (sp__deploy === null) {
    sp__deploy = {};
  }

  for (i in sp__deployDefaults) {
    if (!sp__deploy.hasOwnProperty(i)) {
      sp__deploy[i] = sp__deployDefaults[i];
    }
  }

  //////////////////////////////
  // Server Tasks
  //////////////////////////////
  gulp.task('serve', ['watch', 'watch-components', 'watch-pages', 'watch-scopes', 'watch-compass', 'browser-sync']);
  gulp.task('server', ['serve']);

  //////////////////////////////
  // Refresh the server
  //////////////////////////////
  gulp.task('refresh', function (cb) {
    var build = ['build-server', 'build-pages', 'bcc'],
        config = ['build-config'];

    if (sp__deploy.zip) {
      if (argv.zip === undefined || argv.zip !== false) {
        config.push('zip-server');
      }
    }
    else if (argv.zip) {
      config.push('zip-server');
    }

    return sequence('clean-server',
                    ['build-server', 'build-pages', 'bcc'],
                    config,
                    cb);
  });

  //////////////////////////////
  // Refresh and run the server
  //////////////////////////////
  gulp.task('default', function (cb) {
    return sequence('refresh',
                    'serve',
                    cb);
  });

  //////////////////////////////
  // Copy Bower Components
  //////////////////////////////
  gulp.task('bower-copy-components', function () {
    return gulp.src('bower_components/**/*')
      .pipe(gulp.dest(sp__paths.server + 'bower_components'));
  });
  gulp.task('bcc', ['bower-copy-components']);

  //////////////////////////////
  // Browser Sync
  //////////////////////////////
  gulp.task('browser-sync', function() {
    browserSync.init(null, {
        server: {
            baseDir: sp__paths.server
        }
    });
  });

  //////////////////////////////
  // Clean Working Directory
  //////////////////////////////
  gulp.task('clean-server', function (cb) {
    rimraf(sp__paths.server, cb);
  });

  //////////////////////////////
  // Initial Server Build
  //////////////////////////////
  gulp.task('build-server', function (cb) {
    var assets = ['js', 'img', 'fonts'],
        compass;

    // Move Partials over
    sp__sections.forEach(function (v) {
      fs.copySync(v, sp__paths.partials + v);

      // Plugins
      if (sp__sectionsConfig[v].plugins) {
        sp__sectionsConfig[v].plugins.forEach(function (p) {
          fs.copySync(p, sp__paths.partials + v);
        });
      }
    });

    // Move Assets over
    assets.forEach(function (v) {
      fs.copySync(dirs[v], sp__paths.server + '/' + dirs[v]);
    });

    // Move Index over
    fs.copySync('index.html', sp__paths.server + '/index.html');

    // Compile Sasss
    compass = execute('bundle exec compass compile --force --time --css-dir=.www/' + dirs.css);
    gutil.log(compass.stdout);

    cb();
  });

  //////////////////////////////
  // Build Pages
  //////////////////////////////
  gulp.task('build-pages', function () {
    return gulp.src('pages/**/*')
      .pipe(yamlJSON())
      .pipe(gulp.dest(sp__paths.server + sp__paths.pages));
  });

  //////////////////////////////
  // Build Config
  //////////////////////////////
  gulp.task('build-config', function (cb) {
    var close = 0;

    build.fileJSON(sp__paths.partials, ['.html'], function (files) {
      fs.outputJSON(sp__paths.server + sp__paths.configFile, files);
      gutil.log('Updated file listing');

      if (close < 3) {
        close++;
      }
      else {
        cb();
      }
    });

    build.fileJSON(sp__paths.server + sp__paths.demos + '/', ['.json'], function (files) {
      files.pages.forEach(function (v, k) {
        files.pages[k].path = v.path.replace('partials/', 'demos/');
      });
      fs.outputJSON(sp__paths.server + sp__paths.configPages, files);
      gutil.log('Updated pages listing');

        if (close < 3) {
          close++;
        }
        else {
          cb();
        }
    });

    build.menu(sp__paths, function (menu) {
      fs.outputJSON(sp__paths.server + sp__paths.configMenu, menu);
      gutil.log('Updated menu information');

      if (close < 3) {
        close++;
      }
      else {
        cb();
      }
    });

    build.scopeJSON(function (scope) {
      fs.outputJSON(sp__paths.server + sp__paths.configScope, scope);
      gutil.log('Updated scope information');

      if (close < 3) {
        close++;
      }
      else {
        cb();
      }
    });
  });

  //////////////////////////////
  // Compass Task
  //////////////////////////////
  gulp.task('watch-compass', function (cb) {
    return gulp.src(sp__paths.sass)
      .pipe(shell([
        'bundle exec compass watch --time --css-dir=.www/' + dirs.css
      ]));
  });

  //////////////////////////////
  // Watch
  //////////////////////////////
  gulp.task('watch', function () {
    // JS
    var watchJS = gulp.watch(sp__paths.js,    ['server-js']);
    watchJS.on('change', function (event) {
      if (event.type === 'deleted') {
        delete cache.caches['watch-js'][event.path]
      }
    });

    // Images
    var watchImg = gulp.watch(sp__paths.img,   ['server-img']);
    watchImg.on('change', function (event) {
      if (event.type === 'deleted') {
        delete cache.caches['watch-img'][event.path]
      }
    });

    // Fonts
    var watchFonts = gulp.watch(sp__paths.fonts, ['server-fonts']);
    watchFonts.on('change', function (event) {
      if (event.type === 'deleted') {
        delete cache.caches['watch-fonts'][event.path]
      }
    });

    // Sections
    var watchSections = gulp.watch('config/sections.yml');
    watchSections.on('change', function (event) {
      build.menu(sp__paths,  function (menu) {
        fs.outputJSON(sp__paths.server + sp__paths.configMenu, menu);
        gutil.log('Updated menu information');
        reload();
      });
    });

    // Index
    gulp.watch(sp__paths.index, ['server-index']);
    // CSS
    gulp.watch(sp__paths.server + sp__paths.css, ['server-css']);
    // Style Tile
    gulp.watch('config/style-tile.yml', ['server-style-tile']);
  });

  //////////////////////////////
  // Watch JS
  //////////////////////////////
  gulp.task('server-js', function () {
    return gulp.src(sp__paths.js)
      .pipe(cache('watch-js'))
      .pipe(jshint())
      .pipe(jshint.reporter(stylish))
      .pipe(gulp.dest(sp__paths.server + dirs.js))
      .pipe(reload({stream:true}));
  });

  //////////////////////////////
  // Watch Images
  //////////////////////////////
  gulp.task('server-img', function () {
    return gulp.src(sp__paths.img)
      .pipe(cache('watch-img'))
      .pipe(gulp.dest(sp__paths.server + dirs.img))
      .pipe(reload({stream:true}));
  });

  //////////////////////////////
  // Watch Fonts
  //////////////////////////////
  gulp.task('server-fonts', function () {
    return gulp.src(sp__paths.fonts)
      .pipe(cache('watch-fonts'))
      .pipe(gulp.dest(sp__paths.server + dirs.fonts))
      .pipe(reload({stream:true}));
  });

  //////////////////////////////
  // Watch Index
  //////////////////////////////
  gulp.task('server-index', function () {
    return gulp.src(sp__paths.index)
      .pipe(gulp.dest(sp__paths.server))
      .pipe(reload({stream:true}));
  });

  //////////////////////////////
  // Watch CSS
  //////////////////////////////
  gulp.task('server-css', function () {
    return gulp.src(sp__paths.server + sp__paths.css)
      .pipe(reload({stream:true}));
  });

  //////////////////////////////
  // Watch Sections
  //////////////////////////////
  gulp.task('server-sections', function () {
    return gulp.src('config/sections.yml')
      .pipe(yamlJSON())
      .pipe(gulp.dest(sp__paths.server + 'config'))
      .pipe(reload({stream:true}));
  });

  //////////////////////////////
  // Watch Style Tile
  //////////////////////////////
  gulp.task('server-style-tile', function () {
    return gulp.src('config/style-tile.yml')
      .pipe(yamlJSON())
      .pipe(gulp.dest(sp__paths.server + 'config'))
      .pipe(reload({stream:true}));
  });

  //////////////////////////////
  // Watch Scope
  //////////////////////////////
  gulp.task('watch-scopes', function () {
    return gulp.watch(sp__paths.scopes)
      .on('change', function (event) {
        var start = process.hrtime(),
            filePath = event.path.replace(__dirname + '/', '');

        if (event.type === 'changed') {
          gutil.log('File ' + gutil.colors.magenta('./' + filePath) + ' was ' + gutil.colors.cyan(event.type));

          build.scopeJSON(function (scopeJSON) {
            fs.outputJSON(sp__paths.server + sp__paths.configScope, scopeJSON);
            gutil.log('Updated scope variables');
          });
        }
      });
  });


  //////////////////////////////
  // Watch Pages
  //////////////////////////////
  gulp.task('watch-pages', function() {
    return gulp.watch('pages/**/*')
      .on('change', function (event) {
        var start = process.hrtime();
        var end = false;
        //////////////////////////////
        // Determine relative path and extension
        //////////////////////////////
        var filePath = event.path.replace(process.cwd() + '/', '');
        var ext = path.extname(filePath);
        var noun = (ext === '') ? 'Folder' : 'File';

        // User feedback, something happened!
        gutil.log(noun + ' ' + gutil.colors.magenta('./' + filePath) + ' was ' + gutil.colors.cyan(event.type));

        if (ext === '.yml' || ext === '.html') {
          // If a file is changed or added, copy it over
          if (event.type === 'changed' || event.type === 'added') {
            if (ext === '.html') {
              fs.copySync('./' + filePath, sp__paths.server + sp__paths.demos + '/' + filePath);
            }
            else {
              var contents = yaml.load(filePath);
              filePath = filePath.replace(ext, '.json');
              // if (contents !== null) {
              fs.outputJSONSync(sp__paths.server + sp__paths.demos + '/' + filePath, contents);
              // }
            }
            reload();
          }
          // If a file is deleted, remove it
          else if (event.type === 'deleted') {
            filePath = filePath.replace(ext, '.json');
            fs.removeSync(sp__paths.server + sp__paths.demos + '/' + filePath);
          }

          // Provide user feedback
          gutil.log(patterns.titleize(event.type) + ' ' + gutil.colors.magenta(sp__paths.server + sp__paths.demos + '/' + filePath));

          // Build Files
          if (event.type === 'added' || event.type === 'deleted') {
            build.fileJSON(sp__paths.server + sp__paths.demos + '/', ['.json'], function (files) {
              files.pages.forEach(function (v, k) {
                files.pages[k].path = v.path.replace('partials/', 'demos/');
              });
              fs.outputJSON(sp__paths.server + sp__paths.configPages, files);
              gutil.log('Updated pages listing');

            });
            build.menu(sp__paths, function (menu) {
              fs.outputJSON(sp__paths.server + sp__paths.configMenu, menu);
              gutil.log('Updated menu information');

              if (end === false) {
                end = true;
              }
              else {
                time.elapsed(start, 'watch-pages');
                reload();
              }
            });
          }
        }
      });
  });

  //////////////////////////////
  // Watch Components
  //////////////////////////////
  gulp.task('watch-components', function () {
    return gulp.watch(sp__paths.components)
      .on('change', function (event) {
        var start = process.hrtime();
        var end = false;
        //////////////////////////////
        // Determine relative path and extension
        //////////////////////////////
        var filePath = event.path.replace(process.cwd() + '/', '');
        var ext = path.extname(filePath);
        var noun = (ext === '') ? 'Folder' : 'File';

        // User feedback, something happened!
        gutil.log(noun + ' ' + gutil.colors.magenta('./' + filePath) + ' was ' + gutil.colors.cyan(event.type));

        // Handle HTML files
        if (ext === '.html') {
          // If a file is changed or added, copy it over
          if (event.type === 'changed' || event.type === 'added') {
            fs.copySync('./' + filePath, sp__paths.partials + filePath);
            reload();
          }
          // If a file is deleted, remove it
          else if (event.type === 'deleted') {
            fs.removeSync(sp__paths.partials + filePath);
          }

          // Provide user feedback
          gutil.log(patterns.titleize(event.type) + ' ' + gutil.colors.magenta(sp__paths.partials + filePath));
        }
        // Handle folder removal
        else if (ext === '') {
          // If a folder is deleted, remove it
          if (event.type === 'deleted') {
            fs.removeSync(sp__sections + filePath);
            // Provide user feedback
            gutil.log(patterns.titleize(event.type) + ' ' + gutil.colors.magenta(sp__paths.partials + filePath));
          }
        }

        // If an HTML file or a folder has been added, rebuild the associated JSON
        if (ext === '.html' || ext === '') {
          if (event.type === 'added' || event.type === 'deleted') {
            build.fileJSON(sp__paths.partials, ['.html'], function (fileJSON) {
                fs.outputJSON(sp__paths.server + sp__paths.configFile, fileJSON);
                gutil.log('Updated file listing');
                if (end === false) {
                  end = true;
                }
                else {
                  time.elapsed(start, 'watch-components');
                  reload();
                }

            });
            build.menu(sp__paths, function (menu) {
              fs.outputJSON(sp__paths.server + sp__paths.configMenu, menu);
              gutil.log('Updated menu information');

              if (end === false) {
                end = true;
              }
              else {
                time.elapsed(start, 'watch-components');
                reload();
              }
            });
          }
        }
      });
  });

  //////////////////////////////
  // Dist Tasks
  //////////////////////////////
  gulp.task('dist', function (cb) {
    var copy = ['dist-copy'],
        min = ['dist-min', 'dist-imagemin'];

    if (sp__deploy.zip) {
      if (argv.zip === undefined || argv.zip !== false) {
        copy.push('zip-small');
        min.push('zip-dist');
      }
    }
    else if (argv.zip) {
      copy.push('zip-small');
      min.push('zip-dist');
    }

    return sequence(['refresh', 'dist-clean'],
                    copy,
                    min,
                    'dist-clean-bower',
                    cb);
  });

  gulp.task('dist-clean', function (cb) {
    rimraf(sp__paths.dist, cb);
  });

  gulp.task('dist-copy', function () {
    return gulp.src(sp__paths.server + '/**/*')
      .pipe(gulp.dest(sp__paths.dist));
  });

  gulp.task('dist-min', function () {
    return gulp.src(sp__paths.dist + sp__paths.index)
      .pipe(usemin({
        css: [minifyCSS(), 'concat', rev()],
        js: [uglify(), rev()]
      }))
      .pipe(gulp.dest(sp__paths.dist));
  });

  gulp.task('dist-clean-bower', function (cb) {
    rimraf(sp__paths.dist + 'bower_components', cb);
  });

  gulp.task('dist-imagemin', function () {
    return gulp.src(sp__paths.dist + sp__paths.img)
      .pipe(imagemin({
        progressive: true,
        optimizationLevel: 7,
        interlaced: true,
        svgoPlugins: [{removeViewBox: false}],
        use: [pngcrush()]
      }))
      .pipe(gulp.dest(sp__paths.dist + dirs.img));
  });

  //////////////////////////////
  // Deploy Tasks
  //////////////////////////////
  gulp.task('deploy', function (cb) {
    return sequence('dist',
                    'deploy-dist',
                    'dist-clean',
                    cb);
  });

  gulp.task('deploy-dist', function () {
    return gulp.src(sp__paths.dist)
      .pipe(subtree({
        remote: sp__deploy.remote,
        branch: sp__deploy.branch,
        message: sp__deploy.message
      }))
  });

  //////////////////////////////
  // Export Tasks
  //////////////////////////////
  gulp.task('export', function (cb) {
    return sequence('dist',
                    'export-dist',
                    'dist-clean',
                    cb)
  });

  gulp.task('export-dist', function () {
    return gulp.src(sp__paths.dist + '**/*')
      .pipe(gulp.dest(sp__deploy.export));
  });

  //////////////////////////////
  // Zip
  //////////////////////////////
  gulp.task('zip', function (cb) {
    return sequence('refresh',
                    'zip-small',
                    cb);
  });

  gulp.task('zip-small', function (cb) {
    return sequence('zip-clean',
                    'zip-populate',
                    'zip-build',
                    'zip-clean',
                    cb);
  });

  gulp.task('zip-clean', function (cb) {
    rimraf('.zip', cb);
  });

  gulp.task('zip-dist', function (cb) {
    var name = fs.readJSONSync('bower.json').name.replace('--style-prototype', '');
    fs.move(name + '.zip', '.dist/' + name + '.zip', function (err) {
      cb();
    });
  });

  gulp.task('zip-server', function (cb) {
    return sequence('zip-small',
                    'zip-server-move',
                    cb);
  });

  gulp.task('zip-server-move', function (cb) {
    var name = fs.readJSONSync('bower.json').name.replace('--style-prototype', '');
    fs.move(name + '.zip', sp__paths.server + '/' + name + '.zip', function (err) {
      cb();
    });
  })

  gulp.task('zip-populate', function (cb) {
    var surface = ['sass', 'Gemfile', 'Gemfile.lock', 'bower.json', 'config.rb'],
        www = ['partials', 'demos'],
        length = 0,
        total = 0,
        i;

    for (i in dirs) {
      if (i !== 'html' && i !== 'sass') {
        www.push(i);
      }
    }

    length = surface.length + www.length;

    www.forEach(function (v) {
      fs.copy(sp__paths.server + '/' + v, '.zip/' + v, function (err) {
        total++;
        if (total === length) {
          cb();
        }
      });
    });

    surface.forEach(function (v) {
      fs.copy(v, '.zip/' + v, function (err) {
        total++;
        if (total === length) {
          cb();
        }
      });
    });
  });

  gulp.task('zip-build', function (cb) {
    var name = fs.readJSONSync('bower.json').name.replace('--style-prototype', '');
    process.chdir('.zip');
    return exec('zip -r ../' + name + ' ./', function (err, out, code) {
      process.chdir('..');
      cb();
    });
  });
}
