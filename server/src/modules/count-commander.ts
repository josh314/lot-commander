import type { CounterModel } from '../models/counter';

import { counters } from '@shared/api';

export class CountCommander {

  constructor( private Counter: CounterModel ) {}

  getCounter( handle: counters.Handle ) {
    return this.Counter.findOne( { handle } );
  }

  incrementCounter( handle: counters.Handle, increment: number ) {

    return this.Counter.findOneAndUpdate(
      { handle },
      { $inc: { count: increment } },
      { returnDocument: 'after' },
    ).exec();

  }

}
