import type { Model } from 'mongoose';
import type { ICounter } from '../models/counter';

export class CountCommander {

  constructor( private Counter: Model<ICounter> ) {}

  initializeCounter( handle: string, count: number ) {
    const counter = new this.Counter( { handle, count } );
    return counter.save();
  }

  getCounter( handle: string ) {
    return this.Counter.findOne( { handle } );
  }

  incrementCounter( handle: string, increment: number ) {

    return this.Counter.findOneAndUpdate(
      { handle },
      { $inc: { count: increment } },
      { returnDocument: 'after' },
    ).exec();

  }

}
