gulp-style-prototype
====================

Gulp Tasks for Style Prototypes

## Installation

For setting up a new Style Prototype generator, see [these instructions](https://github.com/north/generator-Style-Prototype#installation).

## Usage

```javascript
'use strict';

var gulp = require('gulp');
require('gulp-style-prototype')(gulp);
```

## Major Tasks

* `gulp`: Builds, runs, and launches a server, including BrowserSync
* `gulp refresh`: Rebuilds the server
* `gulp server`: Runs and launches a server, including BrowserSync
* `gulp dist`: Builds a server-ready distribution of your server to `.dist`
* `gulp export`: Moves `.dist` to `export`
* `gulp deploy`: Deploys `.dist` to a remote Git branch
* `gulp zip`: Creates a ZIP archive of relevant core and server files
