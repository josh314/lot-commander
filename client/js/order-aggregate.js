import * as moment from 'moment';

const orderValue = ( order, tagFilter = null, aggregateByUnits = true ) => {
  let value = 0;

  // TODO: filter out discounts and non-lot items
  const lineItems = order.items.filter( item => {
    if( item ) {
      if( tagFilter ) {
        return item.tags && !!item.tags.find( t => t.match( new RegExp( tagFilter, 'i' ) ) );
      }
      else {
        return true;
      }
    }
    return false;
  });

  for( const item of lineItems ) {
    if( item && item.numUnits) {
      value = value + ( aggregateByUnits ? item.numUnits  : 1 );
    }
  }

  return value;
};

const createHistogramBins = ( startDate, endDate, timeUnits ) => {
  const bins = [];

  // create a counter moment
  const m = moment( startDate ).startOf( timeUnits );

  while( m < endDate ) {
    let bin = {
      // store a copy of the counter moment as bin start data
      start: moment(m),
      // empty order array
      orders: []
    };
    // increment counter moment
    m.add( 1, timeUnits + 's' );

    // store a copy of incremented counter moment as bin end date
    bin.end = moment(m);

    bins.push(bin);
  } 

  return bins;
};

export function aggregateOrders( orders, startDate, endDate, { timeUnits, tagFilter, aggregateByUnits } = {}) {

  orders = orders.map( o => Object.assign( {}, o, { moment: moment(o.date) } ) );
  orders = orders.filter( o => o.moment >= startDate ).filter( o => o.moment <= endDate );

  orders.sort( (a,b) => a.moment > b.moment ? 1 : -1 );

  const bins = createHistogramBins( startDate, endDate, timeUnits );

  // Group orders into bins
  let orderIdx = 0;
  let binIdx = 0;
  while( orderIdx < orders.length && binIdx < bins.length ) {
    const order = orders[orderIdx];
    const bin = bins[binIdx];
    if( order.moment >= bin.start && order.moment <= bin.end ) {
      bin.orders.push(order);
      orderIdx++;
    }
    else { 
      binIdx++;
    }
  }

  // Aggregate bin orders
  for( const bin of bins ) {
    bin.aggregatedValue = bin.orders.reduce( (aggregatedValue, order) => {
      return aggregatedValue + orderValue( order, tagFilter, aggregateByUnits );
    }, 0);
  }

  return bins;
}
