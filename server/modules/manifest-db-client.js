class ManifestDbClient {

  constructor( Manifest ) {
    this.Manifest = Manifest;
  }

  submitNewManifest( manifest ) {
    //TODO: validation -> needs handle
    const newManifest = new this.Manifest( manifest );
    return newManifest.save();
  }

  updateManifest( manifest ) {
    //TODO: validation -> needs handle
    const updateDocument = {  };

    if(manifest.handle) {
      updateDocument.handle = manifest.handle;
    }
    if(manifest.description) {
      updateDocument.description = manifest.description;
    }
    if(manifest.inventory) {
      updateDocument.inventory = manifest.inventory;
    }
    return this.Manifest.findOneAndUpdate(
      { _id: manifest._id },
      { $set: updateDocument },
      { upsert: true, new: true }
    );
  }

  getManifestById( manifestId ) {
    return this.Manifest.findOne({ _id: manifestId });
  }

  deleteManifest( manifestId ) {
    return this.Manifest.remove({ _id: manifestId });
  }

  saveManifest( manifest ) {
    let manifestDbPromise;
    const itemList = manifest.inventory;
    const manifestSummaryStr = `${itemList.reduce((sum,item)=> sum = sum + parseInt(item.quantity), 0)} units across ${itemList.length} SKUs.`;
    if(manifest._id) {
      console.log(`Updating manifest with id ${manifest._id}: ${manifestSummaryStr}`);
      manifestDbPromise = this.updateManifest( manifest );
    }
    else {
      console.log(`Submitting new manifest: ${manifestSummaryStr}`);
      manifestDbPromise = this.submitNewManifest( manifest );
    }
    return manifestDbPromise;
  }

}

module.exports = ManifestDbClient;