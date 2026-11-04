export function isDigit( c: string ) {
  return ('0123456789'.split('')).includes(c);
}

export function isNumericString( s: string ) {
  return typeof s === 'string' && s.split('').every(isDigit);
}

export function getRandomArrayIndex( arr: unknown[] ) {
  if( arr.length === 0 ) {
    throw new Error('Array is empty')
  }
  return Math.floor(Math.random() * arr.length ); // 0 <= Math.random() < 1
}