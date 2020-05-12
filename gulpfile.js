'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var rename = require('gulp-rename');
var browserify = require('browserify');
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var ngAnnotate = require('gulp-ng-annotate');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var livereload = require('gulp-livereload');
var jsoncombine = require('gulp-jsoncombine');
var path = require('path');
var _ = require('lodash');
var merge = require('merge-stream');
var makeDebugDict = require('./gulp/make-debug-translations');

// Use --file=[filename] to run continuous tests on a file during development.
// Gulp will automatically run the tests on that file whenever the code changes
var testFile;
process.argv.forEach(function(arg) {
  if (arg.substr(0, 6) === '--file') {
    testFile = arg.split('=')[1];
  }
});

var paths = {
  js: ['lib/**/*.js', 'models/*.js'],
  backend: ['test/backend/*.test.js'],
  angular: ['public/angular/**/*.js',
    'public/angular/**/*.html',
    '!public/angular/js/app.min.js'
  ],
  translations: 'public/angular/translations/',
  translationsEmail: 'lib/translations/'
};

var pipes = {};

gulp.task('lint', function() {
  gulp.src(paths.js)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

pipes.buildAngular = function() {
  var b = browserify({
    entries: 'public/angular/js/app.js'
  }).bundle();
  return b
    .pipe(source('public/angular/js/app.js'))
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(ngAnnotate())
    .pipe(buffer())
    .pipe(uglify())
    .pipe(rename('app.min.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('public/angular/js'));
};

pipes.debugAngular = function() {
  var b = browserify({
    entries: 'public/angular/js/app.js'
  }).bundle();
  return b
    .pipe(source('public/angular/js/app.js'))
    .pipe(plumber())
    .pipe(rename('app.min.js'))
    .pipe(gulp.dest('public/angular/js'));
};

gulp.task('watchAngular', function() {
  pipes.debugAngular()
    .pipe(livereload());
});

gulp.task('angular', function() {
  return pipes.buildAngular();
});

// Reload browser
gulp.task('angular.watch', function() {
  livereload.listen();
  gulp.watch(paths.angular, gulp.series('watchAngular'));
});

gulp.task('backend', function() {
  // Prefer cli argument, default to all test files
  gulp.src(testFile || paths.backend)
    .pipe(mocha({ reporter: 'spec' }))
    .on('error', _.identity);
});

gulp.task('watch', function() {
  gulp.watch(paths.js, gulp.parallel('lint', 'backend'));
  gulp.watch(paths.backend, gulp.parallel('lint', 'backend'));
});

gulp.task('test', gulp.series('backend'));
//TO DO: Code updated assuming the purpose is to reroute task. Verify what the original code intended to do. 

gulp.task('default', gulp.parallel('test','lint', 'watch'));
//TO DO: Code updated assuming the purpose is to run three tasks in parallel. Verify what the original code intended to do. 

/*
 * Takes a directory of translation dictionaries named locale-foo.json and
 * creates a new dictionary locale-debug.json which has all the (deep) keys of
 * the input files and whose values are ALL_CAPS_UNDERSCORE_DELIMITED, plus
 * any {{interpolated}} {{parameters}} found in the input strings.
 */
pipes.debugTranslations = function(dirname) {
  var debugFilename = 'locale-debug.json';
  return gulp.src([
    '!' + path.join(dirname, debugFilename),
    path.join(dirname, 'locale-*.json')
  ])
    .pipe(jsoncombine(debugFilename, function(data) {
      var result = makeDebugDict(_.values(data));
      return new Buffer.from(JSON.stringify(result, null, 2));
    }))
    .pipe(gulp.dest(dirname));
}; //TO DO: Fix deepmerge interaction error with lodash on later versions of deepmerge. Old version works with latest Node.

gulp.task('debugTranslations', function() {
  var stream1 = pipes.debugTranslations(paths.translations);
  var stream2 = pipes.debugTranslations(paths.translationsEmail);
  return merge(stream1, stream2);
});

gulp.task('build', function() {
  gulp.parallel('debugTranslations', 'angular');
}); //TO DO: Code updated assuming the purpose is to run three tasks in parallel. Verify what the original code intended to do.
