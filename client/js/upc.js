
// Library for some basic UPC functionality, specicifically UPC-A (12 digit) and UPC-E (7/8 digit)

// UPCs are purely numeric codes so these helpers are, um, helpful
const isDigit = c => ('0123456789'.split('')).includes(c);
export const isNumericString = s => typeof s === 'string' && s.split('').every(isDigit);

/**************************************************
 * Anatomy of UPC-A
 * ================
 *
 * UPC's break down into certain component numbers. For a 12-digit UPC-A,
 *
 *     upc = N MMMMM PPPPP C
 *
 * where N is the `number system digit`, MMMMM is the 5 digit `manufacturer code`,
 * PPPPP is the 5 digit `product code` and C is the check digit.
 *
 * N-values of 0,1 or 6-9 represent normal consumer products while others are reserved
 * for special or local usage such as variable weight items (e.g. produce), coupons,
 * loyalty card or drugs (including some OTC)
 *
 ****************/

export function isUpca( str ) {

  if( isNumericString( str ) ) {

    return str.length === 12 && validateCheckDigit( str );

  }

  return false;

}


/***********************************************************
 * Check digits
 * ============
 *
 * These functions are valid for any GTIN formats. This includes not only UPC-A,
 * but also the global EAN/GTIN-13 as well as GTIN-14. Note that UPC-E is an
 * outlier -- the check digit should be that of the corresponding UPC-A
 *
 ****************/

export function calculateCheckDigit( upc ) {
  upc = upc.split('').reverse().join('');
  let total = 0;
  for(let i=0; i<upc.length; i++) {
    if(i % 2===0) {
      total = total + 3*parseInt(upc[i]);
    }
    else {
      total = total + parseInt(upc[i]);
    }
  }
  //Check digit is the remainder after subtracting above sum from nearest (larger or equal) multiple of ten.
  if(parseInt(total/10)===total/10) {//Total is multiple of 10
    return 0;
  }
  else {
    return (parseInt(total/10)+1)*10 -total;
  }
}


// Checks if the barcode includes a check digit
export function validateCheckDigit( barcode ) {
  if( !isNumericString( barcode ) ) {
    return false;
  }
  const lastIdx = barcode.length-1;
  return calculateCheckDigit( barcode.slice( 0, lastIdx ) ) == barcode[ lastIdx ];// use == since we are comparing a string to a number
}

export function addCheckDigit( str ) {

  // return unaltered if not a numeric string
  if( !str || !isNumericString( str ) ) {
    return str;
  }

  return str + calculateCheckDigit( str );
}

/**********************************************************
 * UPC-E
 * =====
 *
 * UPC-E is an abbreviated version of certain UPC-A numbers, obtained by stripping
 * out zeros. Specifically, for a given UPC-12, it suppresses the trailing zeros of MMMMM
 * and the leading zeros of PPPPP. Sources seem to differ on whether UPC-E is a 7 or 8 digit
 * code. It seems like the first digit of the 8 character version is sometimes suppressed, or
 * perhaps the UPC-E is properly 7 dgits while the 8-digit version is obtained by prepending a 0.
 * In any case, a UPC-E/EAN-8 can be lifted to a UPC-A as follows:
 *
 *     - if 8 digits, then ignore the first digit
 *
 *     - drop check digit to get a 6 digit code, the `UPC-E code`
 *
 *     - The last digit of the 6-digit UPC-E code determines how to get the manufacturer and product codes.
 *       See https://en.wikipedia.org/wiki/Universal_Product_Code#UPC-E
 *
 * Another note about UPC-E is that apparently the check digit is actually the check-digit for the
 * corresponding UPC-A code. This differes from the EAN-8 specification where the check digit is just
 * calculated directly from the preceeding 7 digits via the usual mod10 style computation.
 *
 ********/

export function isUpce( str ) {

  if( isNumericString( str ) ) {

    return (str.length === 7 || str.length === 8);// && validateCheckDigit( str );

  }

  return false;

}

export function upceManufacturerCode( upceCode ) {

  if( ! isNumericString( upceCode ) || upceCode.length !== 6 ) {
    return;
  }

  const lastDigit = parseInt( upceCode[5] );

  let manufacturerCode;
  if( lastDigit <= 2 ) {
    manufacturerCode = `${ upceCode.slice( 0, 2 ) }${lastDigit}00`;
  }
  else if( lastDigit === 3 ) {
    manufacturerCode = `${ upceCode.slice( 0, 3 ) }00`;
  }
  else if( lastDigit === 4 ) {
    manufacturerCode = `${ upceCode.slice( 0, 4 ) }0`;
  }
  else {
    manufacturerCode = upceCode.slice( 0, 5 );
  }

  return manufacturerCode;
}


export function upceProductCode( upceCode ) {

  if( ! isNumericString( upceCode ) || upceCode.length !== 6 ) {
    return;
  }

  const lastDigit = parseInt( upceCode[5] );

  let productCode;
  if( lastDigit <= 2 ) {
    productCode = `00${ upceCode.slice( 2, 5 ) }`;
  }
  else if( lastDigit === 3 ) {
    productCode = `000${ upceCode.slice( 3, 5 ) }`;
  }
  else if( lastDigit === 4 ) {
    productCode = `0000${ upceCode[4] }`;
  }
  else {
    productCode = `0000${ lastDigit }`;
  }

  return productCode;
}

export function upce2upca( upce ) {

  if( ! isNumericString( upce ) ) {
    return;
  }

  let upceCode, numberSystemDigit;
  if( upce.length === 7 ) {
    upceCode = upce.slice( 0, 6 ); // get last 6 digits
    numberSystemDigit = '0';
  }
  else if( upce.length === 8 ) {
    upceCode = upce.slice( 1, 7 ); // drop first and last digit
    numberSystemDigit = upce[0];
  }
  else {
    return;
  }

  const baseUpc = numberSystemDigit + upceManufacturerCode( upceCode ) + upceProductCode( upceCode );
  return addCheckDigit( baseUpc );

}