
class CountCommander {
  constructor( CounterModel ) {
    this.Counter = CounterModel;
  }

  initializeCounter( handle, count ) {
    const counter = new this.Counter( { handle, count } );
    return counter.save();
  }

  getCounter( handle ) {
    return this.Counter.findOne( { handle } );
  }

  incrementCounter( handle, increment ) {

    return this.Counter.findOneAndUpdate(
      { handle },
      { $inc: { count: increment } },
      { new: true },
    ).exec();

  }

}

module.exports = CountCommander;
