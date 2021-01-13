/*****************************************
 * Custom Errors
 * =============
 * 
 ****************/

class MyError extends Error {
  constructor(message) {
    super(message);
   // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
   // This clips the constructor invocation from the stack trace.
   // It's not absolutely essential, but it does make the stack trace a little nicer.
   //  @see Node.js reference (bottom)
    Error.captureStackTrace(this, this.constructor);
  }
}

class ClientError extends MyError {
  constructor(message) {
    super(message);
  }
}

class InvalidRequestError extends ClientError {
  constructor() {
    super(`Invalid request`);
  }
}

class ResourceNotFoundError extends ClientError {
  constructor( { type, id } ) {

    let msg;
    if( id ) {
      msg = `No ${ type || 'resource' } found matching id '${id}'`
    }
    else {
      msg = `No matching ${ type || 'resource' } found`;
    }

    super(msg);
  }
}

class ChildResourceNotFoundError extends ClientError {
  constructor( { parentType, parentId, childType, childId }) {

    let msg;
    if( childId ) {
      msg = `No ${ childType } found matching id '${childId}' as child of ${ parentType } with id '${parentId}'`
    }
    else {
      msg = `No matching ${ childType } found as child of ${ parentType } with id '${parentId}'`
    }

    super(msg);

  }
}

class AuthorizationError extends MyError {
  constructor() {
    super('UNAUTHORIZED');
  }
}

module.exports = {
  //base
  ClientError,

  //derived
  AuthorizationError,
  InvalidRequestError,
  ResourceNotFoundError,
  ChildResourceNotFoundError
};
