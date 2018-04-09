module.exports = {
	serverError: {
	  type: 'danger',
	  intro: 'Error:',
	  message: 'Server Error.',
	},
	successfulPasswordChange: {
	  type: 'success',
	  intro: 'Success!',
	  message: 'Password changed. Please log in with your new password.',
	},
	successfulNewUser: {
	  type: 'success',
	  intro: 'Success!',
	  message: 'New user created.',
	},
	errorNewUser: {
	  type: 'danger',
	  intro: 'Error:',
	  message: 'An issue with the server has prevented a new user from being created. Please try again.',
	},
	errorNotAuthorized: {
    type: 'danger',
    intro: 'Error:',
    message: 'You are not authorized to use that feature.'
  },
  userNotFound: {
	  type: 'danger',
	  intro: 'Error:',
	  message: 'The username is not recognized.',
	},
	wrongPassword: {
	  type: 'danger',
	  intro: 'Error:',
	  message: 'The password is incorrect.',
	},
	userAlreadyExists: {
	  type: 'danger',
	  intro: 'Error:',
	  message: 'That username is already in use.',
	},
	successfulBatchErrorLog: {
	  type: 'warning',
	  intro: 'Logged:',
	  message: 'Error logged.',
	},
	succesfulUserEdit: {
		type: 'success',
		intro: 'Success!',
		message: 'User edited.'
	}
};