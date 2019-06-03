const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const save = Promise.promisify(fs.rename);

const formidable = require('formidable');
const archiver = require('archiver');

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'))
const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));

const imgPath = path.join(__basedir, __config.imgPath);
if(!fs.existsSync(imgPath)) {
	fs.mkdirSync(imgPath);
}

function upload(req,res) {
	const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  	const fileUploads = [];
  	for(let [_, f] of Object.entries(files)){
			// const s = save(f.path, path.join(imgPath, f.name), (err)=>{
			// 	if (err) {
			// 		__logger.error(err);
			// 		return;
			// 	}
			// 	if(fields.lotId) {
			// 		return lotdb.addImage(fields.lotId, { filename: f.name });
			// 	}
			// });
			const s = imageServer.store(fields.lotId, f.path, f.name).then(resp=>{
				if(resp) {
					return lotdb.addImage(fields.lotId, { s3: resp.Location });
				}
			});
			fileUploads.push(s);
		}
		res.json(Promise.all(fileUploads));
  });
}

async function removeImage(req, res) {
	const [lotId, image, imageSource] = [req.body.lotId, req.body.image, req.body.imageSource];
	const removeImageFromLotResp = await lotdb.removeImage(lotId, image);
	if(removeImageFromLotResp.error) {
		__logger.error(removeImageFromLotResp.error);
		res.json({error: 'Server error.'});
	}
	else {
		__logger.info(`Removed image ${image} from lot ${lotId}.`);
		res.json({ status: "success" });
		try {
			await imageServer.remove(lotId, image);
			__logger.info(`Image ${imageServer.imageName(lotId, image)} deleted from bucket ${imageServer.bucketName(lotId)}.`);
		}
		catch(e) {
			__logger.warn(`Image ${imageServer.imageName(lotId, image)} could not be deleted from bucket ${imageServer.bucketName(lotId)}.`);
		}
	}
}

async function downloadImages(req, res) {

	const lotRequest = lotdb.getLotById(req.params.lotId);

	__logger.info(`Requesting image download for lotId ${req.params.lotId}...`);
	const archiveType = 'zip';
	const archive = archiver(archiveType, {
	    gzip: true,
	    zlib: { level: 9 } // Sets the compression level.
	});

	archive.on('error', function(err) {
	  throw err;
	});

	archive.on('end', ()=>{
		__logger.info(`Archiver wrote ${archive.pointer()} bytes.`);
	});

	const lot = await lotRequest;
	const archiveFile = `${lot.handle}-images.${archiveType}`;
	res.attachment(archiveFile);
	archive.pipe(res);

	for(let image of lot.images) {
		const p = path.normalize(path.join(__config.imgPath, image.filename));
		__logger.info(`Appending to archive file ${image.filename} as ${image.filename}...`);
		archive.file(p, {name: image.filename});
	}
	archive.finalize();
	__logger.log('Image archive finalized');
}

async function deleteImageFile(req, res) {
	const imageFilePath = path.join(imgPath, req.body.image);
	fs.unlink(imageFilePath, (err) => {
		if(err) {
			console.error(err);
		}
		else {
			console.log(`Successfully deleted ${imageFilePath}.`);
		}
	});
	res.json({ status: "in-progress" });
}

module.exports = {
	upload: upload,
	removeImage: removeImage,
	downloadImages: downloadImages,
	deleteImageFile: deleteImageFile,
};