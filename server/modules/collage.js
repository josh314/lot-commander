const { createCanvas, loadImage } = require('canvas');

const __COLLAGE_WIDTH__ = 1280;
const __COLLAGE_HEIGHT__ = 720;
const __COLLAGE_NUM_ROWS__ = 2;
const __COLLAGE_FILL__ = "white";

const __COLLAGE_HORIZONTAL_GUTTER_SIZE__ = 10;

function draw( canvas, layout ) {

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = __COLLAGE_FILL__;
  ctx.fillRect( 0, 0, __COLLAGE_WIDTH__, __COLLAGE_HEIGHT__ );

  for( let row of layout ) {

    for( let item of row ) {
      ctx.drawImage(
        item.image,
        item.dx,
        item.dy,
        item.dWidth,
        item.dHeight
      );
    }

  }

  return canvas;

}

async function getLayout( imageUrls, { randomize = false } = {} ) {

  const layout = [];

  // copy image array
  let _imageUrls = imageUrls.map( _ => _ );

  if( randomize ) {

    _imageUrls.sort( () => Math.random() - 0.5 );

  }

  const numHorizontalGutters = __COLLAGE_NUM_ROWS__ + 1;
  const horizontalGutterSize = __COLLAGE_HORIZONTAL_GUTTER_SIZE__;

  const rowHeight = Math.floor( ( __COLLAGE_HEIGHT__ - numHorizontalGutters * horizontalGutterSize ) / __COLLAGE_NUM_ROWS__ );


  for( let i=0; i<__COLLAGE_NUM_ROWS__; i++ ) {

    const collageItems = [];

    let j=0;
    let totalRowWidth = 0;

    while( j < _imageUrls.length ) {

      const _imageUrl = _imageUrls[j];
      j++;

      try {

        console.log(`Loading image ${ _imageUrl }`);

        const image = await loadImage( _imageUrl );

        if( !image || image.width <= 1 || image.height <= 1 ) {
          console.log(`Rejecting image ${ _imageUrl }: ${ image.width } x ${ image.height }`);
          continue;
        }

        const scale = rowHeight / image.height < 1 ? rowHeight / image.height : 1;

        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;

        totalRowWidth += scaledWidth;

        if( totalRowWidth > __COLLAGE_WIDTH__ ) {
          break;
        }

        collageItems.push( {
          image,
          scaledWidth,
          scaledHeight,
        } );

      }
      catch(e) {
        console.log(`Error loading image ${ _imageUrl }`);
        continue;
      }

    }

    const leftoverX = __COLLAGE_WIDTH__ - collageItems.reduce( ( _total, _item ) => _total + _item.scaledWidth , 0 );
    const numVerticalGutters = collageItems.length + 1;
    const verticalGutterSize = Math.floor( leftoverX / numVerticalGutters );

    layout[i] = [];

    let currentDx = 0;
    for( let _item of collageItems ) {

      const {
        image,
        scaledWidth,
        scaledHeight
      } = _item;

      const leftoverY = rowHeight - scaledHeight;

      const layoutRowItem = {
        image,
        dx: currentDx + verticalGutterSize,
        dy: (i+1) * horizontalGutterSize + i * rowHeight + Math.floor( leftoverY / 2 ),
        dWidth: scaledWidth,
        dHeight: scaledHeight,
      };


      layout[i].push( layoutRowItem );

      currentDx += scaledWidth + verticalGutterSize;
    }

    _imageUrls = _imageUrls.slice( j );
  }

  return layout;
}

async function createCollageFromProductImageList( imageUrls, { randomize = false } = {} ) {

  const canvas = createCanvas( __COLLAGE_WIDTH__, __COLLAGE_HEIGHT__ );

  const layout = await getLayout( imageUrls, { randomize } );
  draw( canvas, layout );

  const image = canvas.toDataURL();

  return { image };

}

module.exports = {
  createCollageFromProductImageList
};