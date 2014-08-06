/*eslint-env node */
'use strict';
var gulp = require('gulp');
var gp = {
    concat: require('gulp-concat')
};

var mashupName = 'ProgressOfRelated';
var dest = '../Targetprocess-mashups/' + mashupName;
var src = 'src';
var release = 'release';

gulp.task('copy', function() {

    return gulp.src(src + '/*')
    .pipe(gulp.dest(dest));
});

gulp.task('concat', function() {

    return gulp.src([src + '/ProgressOfRelated.config.js', src + '/ProgressOfRelated.js'])
    .pipe(gp.concat(mashupName + '.js'))
    .pipe(gulp.dest(release + '/'));
});

gulp.task('watch', function() {

    gulp.watch(src + '/*', ['copy']);
});

gulp.task('release', ['concat']);
gulp.task('default', ['copy', 'watch']);

