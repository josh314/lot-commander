
// Styles
import './less/app.less';

// third-party lib configuration
import * as Promise from 'bluebird';
// Using an eslint config comment to prevent a false positive linting error
// eslint-disable-next-line angular/module-getter
Promise.config({
  // These are production settings for using bluebird: see http://bluebirdjs.com/docs/install.html
  longStackTraces: false,
  warnings: false
});


// Angular setup
import "./js/ng-app";

// Angular components
import "./js/components/auctions.js";
import "./js/components/edit-manifest.js";
import "./js/components/file-request-modal.js";
import "./js/components/file-upload.js";
import "./js/components/flash.js";
import "./js/components/focus.js";
import "./js/components/footer.js";
import "./js/components/gallery.js";
import "./js/components/image-editor.js";
import "./js/components/image-svc.js";
// import "./js/components/imports.js";
import "./js/components/list-lots.js";
import "./js/components/listing-builder.js";
import "./js/components/listing-title-verifier.js";
import "./js/components/load-lot.js";
import "./js/components/lot-store.js";
import "./js/components/manifest-files-list.js";
import "./js/components/message-modal.js";
import "./js/components/navbar.js";
import "./js/components/new-lot.js";
import "./js/components/packaging-type-info-modal.js";
import "./js/components/print-svc.js";
import "./js/components/root.js";
import "./js/components/save-lot.js";
import "./js/components/save-manifest.js";
import "./js/components/scan.js";
import "./js/components/shipping-items-modal.js";
import "./js/components/submit-listing.js";
// import "./js/components/upload-3p-manifest.js";
import "./js/components/upload-lot-manifest.js";
import "./js/components/users.js";
import "./js/components/view-lot.js";
