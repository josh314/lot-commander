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
  constructor( message, code ) {
    super(message);
    this.code = code;
  }
}

class IllegalActionError extends ClientError {
  constructor( message, code ) {
    super( `Illegal action: ${message}`, code );
  }
}

class InvalidRequestError extends ClientError {
  constructor( msg ) {
    super(`Invalid request${ msg ? ': ' + msg : '' }`);
  }
}

class ResourceNotFoundError extends ClientError {
  constructor( { type, id } ) {

    let msg;
    if( id ) {
      msg = `No ${ type || 'resource' } found matching id '${id}'`;
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
      msg = `No ${ childType } found matching id '${childId}' as child of ${ parentType } with id '${parentId}'`;
    }
    else {
      msg = `No matching ${ childType } found as child of ${ parentType } with id '${parentId}'`;
    }

    super(msg);

  }
}

class ExternalMediaNotFoundError extends MyError {
  constructor( url ) {
    super( url );
  }
}

class AuthorizationError extends MyError {
  constructor( endpoint ) {
    super( endpoint || 'UNAUTHORIZED' );
  }
}

module.exports = {
  //base
  ClientError,

  //derived
  AuthorizationError,
  IllegalActionError,
  InvalidRequestError,
  ResourceNotFoundError,
  ChildResourceNotFoundError,
  ExternalMediaNotFoundError
};
