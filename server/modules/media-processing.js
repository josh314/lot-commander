const ffmpeg = require('fluent-ffmpeg');
const { ffmpegPath, ffprobePath } = require('ffmpeg-ffprobe-static');
const dayjs = require('dayjs');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const sharp = require('sharp');
const MAX_IMAGE_WIDTH = 1920;

function probeVideo( inputPath ) {

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe( inputPath, ( err, metadata ) => {
      if( err ) {
        reject( err );
      }
      else {
        resolve( metadata );
      }
    });
  });

}

async function convertVideo( inputPath, outputPath, loggingFilename ) {

  const startTime = dayjs();
  const metadata = await probeVideo( inputPath );
  const totalFrames = metadata.streams.find( _ => _.codec_type === 'video' ).nb_frames;

  return new Promise((resolve, reject) => {

    ffmpeg( inputPath )
      .output( outputPath )
      .videoCodec('libx264')
      .on('progress', function( progress ) {

        if( progress.percent ) {
          console.log(`Converting file \`${ loggingFilename }\`: ${ progress.percent.toFixed(2) }%`);
        }
        else if( totalFrames && totalFrames > 0 ) {

          if( progress.frames > 0 ) {

            const framesProcessedPercentage = ( progress.frames / totalFrames ) * 100;

            console.log(`Converting file \`${ loggingFilename }\`: ${ framesProcessedPercentage.toFixed(2) }%`);
          }

        }
        else if ( progress.timemark ) {
          console.log(`Converting file \`${ loggingFilename }\`: ${ progress.timemark }`);
        }
        else {
          console.log(`Converting file \`${ loggingFilename }\`: ${ progress }`);
        }

      })
      .on('end', () => {
        const endTime = dayjs();
        console.log(`Conversion of file \`${ loggingFilename }\` successful. Elapsed time: ${endTime.diff( startTime, 'second' )} seconds.`);
        resolve();
      })
      .on('error', ( err ) => {
        console.error(`Converting file \`${ loggingFilename }\`: conversion failed.`);
        console.error( err.message );
        reject( err );
      })
      .run();
  });

}


async function formatAsCompressedJpeg( imgPath, opts={} ) {

  const img = sharp( imgPath );

  const meta = await img.metadata();

  if( !meta.width || meta.width > MAX_IMAGE_WIDTH ) {
    img.resize( MAX_IMAGE_WIDTH );
  }

  return img
    .jpeg({
      quality: opts.quality || 80,
      progressive: true,
      chromaSubsampling: '4:2:0',
      force: true
    })
    .toBuffer();
}


module.exports = {
  convertVideo,
  formatAsCompressedJpeg,
  probeVideo
};