const path = require('path');

module.exports = {
  prod: {
    stylesheets: [
      'css/app.min.css',
    ],
    scripts: {
      ext: [
        "/3rd-party/angular.1.6.3.min.js",
        "/3rd-party/angular-sanitize.1.6.3.min.js",
        "/3rd-party/angular-animate.1.6.3.min.js",
        "/3rd-party/angular-ui-router.0.4.2.min.js",
        "/3rd-party/ui-bootstrap-tpls-2.5.0.min.js",
      ],
      local: [
        //uglified js
        "/js/build/client.min.js"
      ],
    },
  },
  dev: {
    stylesheets: [
      'css/app.css'
    ],
    scripts: {
      ext: [
        "/3rd-party/angular.1.6.3.js",
        "/3rd-party/angular-cookies.1.6.9.js",
        "/3rd-party/angular-sanitize.1.6.3.js",
        "/3rd-party/angular-animate.1.6.3.js",
        "/3rd-party/angular-ui-router.0.4.2.js",
        "/3rd-party/ui-bootstrap-tpls-2.5.0.js",
      ],
      local: [
        //Put any non-angular files first
        "/js/ng-app-init.js",
        "/build/ng-app-server-data.js",//not a static JS file but an express endpoint!
        "/js/ng-app-data.js",
        "/js/ng-app-config.js",
        "/js/ng-app-run.js",
        //angular components
        "/js/components/file-upload.js",
        "/js/components/file-request-modal.js",
        "/js/components/focus.js",
        "/js/components/footer.js",
        "js/components/list-lots.js",
        "/js/components/lot-store.js",
        "/js/components/manifest-files-list.js",
        "/js/components/message-modal.js",
        "/js/components/navbar.js",
        "/js/components/new-lot.js",
        "/js/components/root.js",
        "/js/components/scan.js",
        "/js/components/submit-listing.js",
        "/js/components/upload-3p-manifest.js",
        "/js/components/users.js",
        "/js/components/view-lot.js",
        ]
    }
  }
};