var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var paths = require('compass-options').paths();
var dirs = require('compass-options').dirs();
var browserSync = require('browser-sync');
var shell = require('gulp-shell');
var subtree = require('gulp-subtree');
var yaml = require('js-yaml');
var fs = require('fs');
var clean = require('gulp-clean');
var sequence = require('run-sequence');

var watch = require('gulp-watch');
var plumber = require('gulp-plumber');
var filter = require('gulp-filter');

var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-minify-css');
var rev = require('gulp-rev');

var imagemin = require('gulp-imagemin');
var pngcrush = require('imagemin-pngcrush');

var folderwalk = require('./helpers/exports.js').folderwalk;
var yamlJSON = require('./helpers/yaml-json.js').yaml2json;
var buildScope = require('./helpers/menu.js').buildScope;
var buildMenu = require('./helpers/menu.js').buildMenu;
var pagewalk = require('./helpers/pages.js').pagewalk;
var maid = require('./helpers/maid.js').maid;

module.exports = function (gulp) {
  gulp.task('pages', function () {
    gulp.src('pages/**/*.yml')
      .pipe(plumber())
      .pipe(yamlJSON())
      .pipe(gulp.dest('.tmp/pages'))
      .pipe(pagewalk())
      .pipe(browserSync.reload({stream:true}));
  });

  gulp.task('sections', function () {
    watch({ glob: 'config/sections.yml'})
      .pipe(yamlJSON())
      .pipe(gulp.dest('.www/config'))
      .pipe(buildMenu())
      .pipe(browserSync.reload({stream:true}));

    watch({ glob: 'config/style-tile.yml' })
      .pipe(yamlJSON())
      .pipe(gulp.dest('.www/config'))
      .pipe(browserSync.reload({stream:true}));
  });

  gulp.task('bower-copy-components', function () {
    gulp.src('bower_components/**/*')
      .pipe(gulp.dest('.www/bower_components'));
  });

  gulp.task('bcc', ['bower-copy-components']);

  //////////////////////////////
  // Begin Gulp Tasks
  //////////////////////////////
  gulp.task('lint', function () {
    return gulp.src([
        paths.js + '/**/*.js',
        '!' + paths.js + '/**/*.js'
      ])
      .pipe(jshint())
      .pipe(jshint.reporter(stylish));
  });

  //////////////////////////////
  // Compass Task
  //////////////////////////////
  gulp.task('compass', function () {
    return gulp.src(paths.sass + '/**/*')
      .pipe(shell([
        'bundle exec compass watch --time --css-dir=.www/' + dirs.css
      ]));
  });

  //////////////////////////////
  // Copies the partials over
  //////////////////////////////
  gulp.task('components', function () {
    var sections = yaml.safeLoad(fs.readFileSync('./config/sections.yml', 'utf8'));

    Object.keys(sections).forEach(function (k) {
      var dest = '.www/partials/' + k;
      if (!fs.existsSync('.www')) {
        fs.mkdirSync('.www');
      }
      if (!fs.existsSync('.www/partials')) {
        fs.mkdirSync('.www/partials');
      }
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }

      watch({ glob: k + '/**/*' })
        .pipe(plumber())
        .pipe(maid({folder: k}))
        .pipe(folderwalk({
          'base': k
        }))
        .pipe(browserSync.reload({stream:true}));

      watch({ glob: k + '/' + k +'.yml' })
        .pipe(plumber())
        .pipe(yamlJSON())
        .pipe(gulp.dest('.tmp/scopes'))
        .pipe(buildScope())
        .pipe(browserSync.reload({stream:true}));
    });

    watch({ glob: 'pages/**/*.yml' })
      .pipe(plumber())
      .pipe(yamlJSON())
      .pipe(gulp.dest('.tmp/pages'))
      .pipe(pagewalk())
      .pipe(buildMenu())
      .pipe(browserSync.reload({stream:true}));
  });

  //////////////////////////////
  // Watches for changes to the tmp data and rebuilds the menus and files
  //////////////////////////////
  gulp.task('data', function () {
    watch({ glob: '.tmp/data/*.json'})
      .pipe(buildMenu())
      .pipe(browserSync.reload({stream:true}));
  });

  //////////////////////////////
  // Watch
  //////////////////////////////
  gulp.task('watch', function () {

    watch({ glob: dirs.js + '/**/*.js' })
      .pipe(jshint())
      .pipe(jshint.reporter(stylish))
      .pipe(gulp.dest('.www/' + dirs.js));

    watch({ glob: dirs.img + '/**/*'})
      .pipe(gulp.dest('.www/' + dirs.img));

    watch({ glob: '.www/' + dirs.fonts + '/**/*' })
      .pipe(gulp.dest('.www/' + dirs.fonts));

    watch({ glob: 'index.html' })
      .pipe(gulp.dest('.www/'));
  });

  // gulp.task('walk', function () {
  //   gulp.src('components')
  //     .pipe(folderwalk({
  //       'base': 'components'
  //     }))
  // });

  //////////////////////////////
  // BrowserSync Task
  //////////////////////////////
  gulp.task('browserSync', function () {
    browserSync.init([
      '.www/' + dirs.css +  '/**/*.css',
      '.www/' + dirs.js + '/**/*.js',
      '.www/' + dirs.img + '/**/*',
      '.www/' + dirs.fonts + '/**/*',
      '.www/**/*.html',
    ], {
      server: {
        baseDir: '.www'
      }
    });
  });

  //////////////////////////////
  // Server Tasks
  //////////////////////////////
  gulp.task('server', ['watch', 'sections', 'bcc', 'components', 'data', 'compass', 'browserSync']);
  gulp.task('serve', ['server']);

  //////////////////////////////
  // Init
  //////////////////////////////
  gulp.task('build-init', function () {
    //////////////////////////////
    // Watch
    //////////////////////////////
    gulp.src(dirs.js + '/**/*.js')
      .pipe(jshint())
      .pipe(jshint.reporter(stylish))
      .pipe(gulp.dest('.www/' + dirs.js));

    gulp.src(dirs.img + '/**/*')
      .pipe(gulp.dest('.www/' + dirs.img));

    gulp.src('.www/' + dirs.fonts + '/**/*' )
      .pipe(gulp.dest('.www/' + dirs.fonts));

    gulp.src('index.html' )
      .pipe(gulp.dest('.www/'));

    //////////////////////////////
    // Sections
    //////////////////////////////
    gulp.src('config/sections.yml')
      .pipe(yamlJSON())
      .pipe(gulp.dest('.www/config'))
      .pipe(buildMenu());

    gulp.src('config/style-tile.yml' )
      .pipe(yamlJSON())
      .pipe(gulp.dest('.www/config'));

    //////////////////////////////
    // Bower Components
    //////////////////////////////
    gulp.src('bower_components/**/*')
      .pipe(gulp.dest('.www/bower_components'));

    //////////////////////////////
    // Components
    //////////////////////////////
    var sections = yaml.safeLoad(fs.readFileSync('./config/sections.yml', 'utf8'));

    Object.keys(sections).forEach(function (k) {
      var dest = '.www/partials/' + k;
      if (!fs.existsSync('.www')) {
        fs.mkdirSync('.www');
      }
      if (!fs.existsSync('.www/partials')) {
        fs.mkdirSync('.www/partials');
      }
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }

      gulp.src(k + '/**/*' )
        .pipe(plumber())
        .pipe(maid({folder: k}))
        .pipe(folderwalk({
          'base': k
        }));

      gulp.src(k + '/' + k +'.yml' )
        .pipe(plumber())
        .pipe(yamlJSON())
        .pipe(gulp.dest('.tmp/scopes'))
        .pipe(buildScope());
    });

    gulp.src('pages/**/*.yml' )
      .pipe(plumber())
      .pipe(yamlJSON())
      .pipe(gulp.dest('.tmp/pages'))
      .pipe(pagewalk())
      .pipe(buildMenu());

    //////////////////////////////
    // Data
    //////////////////////////////
    gulp.src('.tmp/data/*.json')
      .pipe(buildMenu());
  });

  gulp.task('build-compass', shell.task([
    'bundle exec compass compile --time --css-dir=.www/' + dirs.css
  ]));

  gulp.task('init', ['build-compass', 'build-init']);

  //////////////////////////////
  // Refresh
  //////////////////////////////
  gulp.task('clean-tmp', function () {
    return gulp.src('.tmp').pipe(clean());
  });

  gulp.task('clean-working', function () {
    return gulp.src('.www').pipe(clean());
  });

  gulp.task('clean', ['clean-tmp', 'clean-working']);

  gulp.task('refresh', function () {
    sequence(
      'clean',
      'init'
    );
  });

  //////////////////////////////
  // Build
  //////////////////////////////
  gulp.task('build-clean', function () {
    return gulp.src('.dist').pipe(clean());
  });

  gulp.task('build-copy-config', function () {
    return gulp.src('.www/config/**/*').pipe(gulp.dest('.dist/config/'));
  });

  gulp.task('build-copy-partials', function () {
    return gulp.src('.www/partials/**/*').pipe(gulp.dest('.dist/partials/'));
  });

  gulp.task('build-copy-fonts', function () {
    return gulp.src('./fonts/**/*').pipe(gulp.dest('.dist/fonts/'));
  });

  gulp.task('build-export', function () {
    return gulp.src('.dist/**/*').pipe(gulp.dest('EXPORT/'));
  })

  gulp.task('build-min', function () {
    return gulp.src('.www/index.html')
      .pipe(usemin({
        css: [cssmin(), 'concat', rev()],
        js: [uglify(), rev()]
      }))
      .pipe(gulp.dest('.dist/'));
  });

  gulp.task('build-images', function () {
    return gulp.src('./images/**/*')
      .pipe(imagemin({
        progressive: true,
        svgoPlugins: [{removeViewBox: false}],
        use: [pngcrush()]
      }))
      .pipe(gulp.dest('.dist/images/'))
  });

  gulp.task('deploy', function () {
    var deploy = yaml.safeLoad(fs.readFileSync('./config/deploy.yml', 'utf8'));

    if (deploy === undefined) {
      deploy.remote = 'upstream';
      deploy.branch = 'gh-pages';
      deploy.message = 'Style Prototype Deploy';
    }

    return gulp.src('.dist')
      .pipe(subtree({
        remote: deploy.remote,
        branch: deploy.branch,
        message: deploy.message
      }))
      .pipe(clean());
  });

  gulp.task('build', function (cb) {
    return sequence(
      'build-clean',
      ['build-copy-config', 'build-copy-partials', 'build-copy-fonts', 'build-min', 'build-images']
    );
  });

  //gulp deploy fails silently (oh javascript) if .dist/ is not not already built... 
  gulp.task('build-deploy', function (cb) {
    return sequence(
      'build-clean',
      ['build-copy-config', 'build-copy-partials', 'build-copy-fonts', 'build-min', 'build-images'],
      'deploy'
    );
  });

  gulp.task('export', function (cb) {
    sequence(
      'build-clean',
      'build-copy',
      'build-export'
    );
  });

  // gulp.task('deploy', function (cb) {
  //   sequence(
  //     'build-clean',
  //     'build',
  //     'build-deploy'
  //   );
  // });

  //////////////////////////////
  // Default Task
  //////////////////////////////
  gulp.task('default', ['server']);
}
