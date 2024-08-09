
const ffmpeg = require('fluent-ffmpeg');
const { ffmpegPath, ffprobePath } = require('ffmpeg-ffprobe-static');
const dayjs = require('dayjs');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const sharp = require('sharp');
const MAX_IMAGE_WIDTH = 1920;

const __ACTIVE_PROCESSES__ = new Map();

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

async function convertVideo( inputPath, outputPath, loggingFilename, jobKey ) {

  const startTime = dayjs();
  const metadata = await probeVideo( inputPath );
  const totalFrames = metadata.streams.find( _ => _.codec_type === 'video' ).nb_frames;


  let ffmpegCommand;

  const p = new Promise((resolve, reject) => {

    ffmpegCommand = ffmpeg( inputPath )
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
      });

    ffmpegCommand.run();

  });
    // .catch( console.error );

  const cancel = () => {
    try {

      if ( ffmpegCommand ) {
        ffmpegCommand.kill('SIGKILL');
        if( ffmpegCommand.ffmpegProc ) {
          // Kill the entire process group
          process.kill(-ffmpegCommand.ffmpegProc.pid, 'SIGKILL');
        }
      }

    }
    catch( e ) {
      // seems killing processes throw an error no matter what
      console.error( e );
    }
  };

  __ACTIVE_PROCESSES__.set( jobKey, { process: p, cancel } );

  return p;

}

async function cancelActiveProcess( jobKey ) {
  const activeProcess = __ACTIVE_PROCESSES__.get( jobKey );
  if( activeProcess ) {
    __ACTIVE_PROCESSES__.delete( jobKey );
    activeProcess.cancel();
  }
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
  cancelActiveProcess,
  convertVideo,
  formatAsCompressedJpeg,
  probeVideo
};