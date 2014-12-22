var gulp = require('gulp');
var jade = require('gulp-jade');
var stylus = require('gulp-stylus');
//var imagemin = require('gulp-imagemin');
var gutil = require("gulp-util");
var plumber = require("gulp-plumber");
var changed = require("gulp-changed");

var source = require('vinyl-source-stream')
var streamify = require('gulp-streamify')
var browserify = require('browserify')
var uglify = require('gulp-uglify')

//var serve = require('gulp-serve');

var bower = require("bower");
var async = require("async");
var child_process = require("child_process");
//var cluster = require("cluster");

//var Notifier = require("node-notifier");

var crashOnError = true;


function errorBeep(err) {
    gutil.beep();
    console.log(err);

    var text = err.message || err.toString() || "Unknown Error";

    // var n = new Notifier();
    // n.notify({
    //     title: "Build Error"
    //     , message: text
    //     , icon: __dirname + "/sandbox/bad-snap.png"
    // });
    // if (err.stack) {
    //     console.error(err.stack);
    // }

    if (crashOnError) {
        process.exit(-1);
    }
    return null;
};



//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("html_templates_html", function() {
    return gulp.src('src/html/**/*.jade')
        .pipe( changed("dist/html", {extension:".html"}) )
        .pipe( plumber( { errorHandler: errorBeep } ) )
        .pipe(jade({
            // locals: YOUR_LOCALS
        }))
        .pipe(gulp.dest('dist/html'))
});

//////////////////////////////////////////////////////////////////////////////////////////
// These are .jade files that end up as HTML on the server
gulp.task('html_templates_root', function() {
    // Grab stuff out of the root directory (i.e. index.html)

    // We don't use changed here because index.jade depends on layout.jade

    var locals = {};

    return gulp.src('src/root/index.jade')
        .pipe( plumber( { errorHandler: errorBeep } ) )
        .pipe(jade({
            locals: locals
        }))
        .pipe(gulp.dest('dist'))

});

gulp.task("html_templates", ["html_templates_html", "html_templates_root"], function() { } );

//////////////////////////////////////////////////////////////////////////////////////////
// Jade files that end up as functions for use generating client side stuff
gulp.task('js_templates', function() {

    return gulp.src('src/templates/*.jade')
        .pipe( changed("dist/templates", {extension:".html"}) )
        .pipe( plumber( { errorHandler: errorBeep } ) )
        .pipe(jade({
            client: true
        }))
        .pipe(gulp.dest('dist/templates'))

});

//////////////////////////////////////////////////////////////////////////////////////////
// Get and render all .styl files recursively
gulp.task('stylus', function () {
    var nib = require('nib');

    gutil.log("Doing css");
    // Like with the HTML files, there is an index for css, so if anything at all changes
    // we have to redo the whole dir.
    gulp.src('src/css/kmptool.styl')
        .pipe( plumber( { errorHandler: errorBeep } ) )
        .pipe(stylus({
            use: [nib()]
            , paths: ["src/css/inc"]
        }))
        .pipe(gulp.dest('dist/css'))
});

//////////////////////////////////////////////////////////////////////////////////////////
gulp.task('images', function () {
    return gulp.src('src/images/**/*')
        .pipe( changed("dist/images") )
        .pipe( plumber( { errorHandler: errorBeep } ) )
        // .pipe(imagemin({
        //     progressive: true
        // }))
        .pipe(gulp.dest('dist/images'))
});


//////////////////////////////////////////////////////////////////////////////////////////
// gulp.task("index_js", function() {
//     return gulp.src("src/js/index.js")
//         .pipe(gulp.dest("dist/js/"))
// });

//////////////////////////////////////////////////////////////////////////////////////////
gulp.task('browserify', function() {

    var ret = plumber( { 
            errorHandler: function(err) { 
                //gutil.log("plumber err "); 
                errorBeep(err); 
                
                // If we don't explicitly end the stream, we'll be stuck because
                // browserify isn't going to do so on it's own.
                ret.end();
            } 
        } )
        .pipe(browserify('./src/js/index.js').bundle())
        .pipe(source('kmptool.js'))
        // .pipe(streamify(uglify()))
        .pipe(gulp.dest('dist/js'))

    return ret;
});



gulp.task("build",  ["html_templates", "js_templates", "stylus", "images", "browserify"], function() {  });

//////////////////////////////////////////////////////////////////////////////////////////
gulp.task("server", function(cb) {    
    require("./server");
});

//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
// Regular build
gulp.task('default', ["build"], function(cb) {
    crashOnError = false;
    
    gutil.log(gutil.colors.blue("Setting up a whole boatload of watches...."));
    
    gulp.watch("src/html/**/*.jade", ["html_templates_html"]);
    gulp.watch("src/root/**/*.jade", ["html_templates_root"]);
    gulp.watch("src/templates/*.jade", ["js_templates"]);
    gulp.watch("src/css/**/*.styl", ["stylus"]);
    gulp.watch("src/images/**/*", ["images"]);
    gulp.watch("src/js/**/*.js", ["browserify"]);
    gulp.watch("src/js/index.js", ["index_js"]);

    gulp.start("server");
});
