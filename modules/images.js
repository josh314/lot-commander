const path = require('path');
const fs = require('fs');

const formidable = require('formidable')

const imgPath = path.join(__basedir, __config.imgPath);
if(!fs.existsSync(imgPath)) {
	fs.mkdirSync(imgPath);
}

function upload(req,res) {
	const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
  	console.log(fields)
  	for(let [_, f] of Object.entries(files)){
			fs.rename(f.path, path.join(imgPath, f.name), (err)=>{if (err) console.log(err)})
		}
  });
	res.json({thinq: "foobar"});
}

module.exports = {
	upload: upload,
};