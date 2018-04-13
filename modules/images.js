const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const save = Promise.promisify(fs.rename);

const formidable = require('formidable')

const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'))

const imgPath = path.join(__basedir, __config.imgPath);
if(!fs.existsSync(imgPath)) {
	fs.mkdirSync(imgPath);
}

function upload(req,res) {
	const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  	const fileUploads = [];
  	for(let [_, f] of Object.entries(files)){
			const s = save(f.path, path.join(imgPath, f.name), (err)=>{
				if (err) {
					console.log(err);
					return;
				}
				if(fields.lotId) {
					return lotdb.addImage(fields.lotId, { filename: f.name });
				}
			});
			fileUploads.push(s);
		}
		res.json(Promise.all(fileUploads));
  });
}

module.exports = {
	upload: upload,
};