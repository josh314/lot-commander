const path = require('path');
const fs = require('fs');


console.log('Loading deployment configuration file.');
let deployConfig;
try {
  deployConfig = require(path.join(__dirname, 'config'));
}
catch (exception) {
  console.log(exception)
  console.log("No deployment configuration file found. Exiting.");
  process.exit(-1);
}

// const jsClientDevDir = path.join(__dirname, deployConfig.assets.root, 'js');
// let clientScripts = fs.readdirSync(jsClientDevDir).filter(file => file!=='components' );
// clientScripts = clientScripts.concat(fs.readdirSync(path.join(jsClientDevDir, 'components')).map(file => path.join('components', file)));
// clientScripts = clientScripts.filter(file => !file.match(/\.DS_Store|~/)).map(file => path.join(jsClientDevDir, file))

module.exports = grunt => {
  // Load grunt tasks automatically, when needed.
  // Affects all modules, not just those explicitly listed. The
  // explicitly listed modules are the ones with name resolution issues.
  // Removing this requires adding a grunt.loadNpmTasks('some-module') call
  // for each module in the Gruntfile
  require('jit-grunt')(grunt, {
    //express: 'grunt-express-server',
    // ngtemplates: 'grunt-angular-templates',
  });

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // htmlPartialsDir: 'client/public/partials',
    lessDir: path.join(__dirname, deployConfig.assets.less),
    cssDir: path.join(__dirname, deployConfig.assets.root, deployConfig.assets.css),
    jsBuildDir: path.join(__dirname, deployConfig.assets.root, deployConfig.assets.js.build),
    clean: {
      build: {
        src: [
          "<%=cssDir%>",
          "<%=jsBuildDir%>"
        ]
      }
    },
    less: {
      dev: {
        options: {
          compress: false,
          sourceMap: false,
          sourceMapFilename: '<%=cssDir%>/app.css.map',
          sourceMapURL: '<%=cssDir%>/app.css.map',
          sourceMapBasepath: '/',
          sourceMapRootpath: '/'
        },
        files: { '<%=cssDir%>/app.css': '<%=lessDir%>/main.less'}
      },
      dist: {
        options: {
          compress: true,
          sourceMap: false,
          sourceMapFilename: '<%=cssDir%>/app.min.css.map',
          sourceMapURL: '<%=cssDir%>/app.min.css.map',
          // sourceMapBasepath: 'client/public',
          // sourceMapRootpath: '/',
          banner: '/*! Copyright Joshua Davis 2016 */ \n'
        },
        files: { '<%=cssDir%>/app.min.css': '<%=lessDir%>/main.less'}
      }
    },
  });

  grunt.registerTask('css', ['less:dev', 'less:dist']);
  grunt.registerTask('build', ['clean', 'css']);
  grunt.registerTask('default', ['build']);
};