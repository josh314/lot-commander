import angular from 'angular';

// helper directive to bind a stream to a video element
angular.module('myApp').directive('videoSrcObject', function() {
  return {
    restrict: 'A',

    scope: {
      videoSrcObject: '=',
    },

    link: function( scope, element ) {
      scope.$watch('videoSrcObject', function(stream) {
        element[0].srcObject = stream;
      });
    },

  };
});

/*********************** Camera Directive ***********************/
angular.module('myApp').directive('cameraDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_camera.html',
    scope: {
      uploadFn: '&',
      cameraIsOpened: '=?',
    },
    controller: 'CameraDirCtrl as $ctrl',
  };
});


angular.module('myApp').controller( 'CameraDirCtrl', [

  '$interval',
  '$scope',
  '$window',
  'ModalSvc',

  function(

    $interval,
    $scope,
    $window,
    ModalSvc,

  ) {

    const vm = this;
    init();

    async function init() {

      $scope.cameraIsOpened = $scope.cameraIsOpened || false;

      $scope.$watch('cameraIsOpened', async function() {
        if( $scope.cameraIsOpened ) {
          ModalSvc.wait({
            waitFor: setVideoDevices().then( startCamera ),
            message: 'Starting camera...'
          });
        }
        vm.cameraIsOpened = $scope.cameraIsOpened;
      });

      Object.assign(
        vm,
        {

          toggleCameraOpen: () => $scope.cameraIsOpened = !$scope.cameraIsOpened,

          videoCodec: 'video/mp4; codecs="avc1.42E01E"',
          videoBitRate: 2.5*1000*1000,

          openCamera,
          closeCamera,

          isRecording,
          isPaused,
          hasRecorded,
          canStartRecording,
          readyToFinish,

          startRecording,
          finishRecording,
          pauseRecording,
          resumeRecording,
          cancelRecording,

        }
      );

      clearRecording();
    }

    function isRecording() {
      return vm.mediaRecorder && vm.mediaRecorder.state === 'recording';
    }

    function isPaused() {
      return vm.mediaRecorder && vm.mediaRecorder.state === 'paused';
    }

    function hasRecorded() {
      return isRecording() || isPaused();
    }

    function canStartRecording() {
      return vm.currentStream && !isRecording() && !isPaused();
    }

    function readyToFinish() {
      return hasRecorded() && isPaused();
    }

    function openCamera() {
      $scope.cameraIsOpened = true;
    }

    async function closeCamera() {

      if ( isRecording() ) {
        vm.mediaRecorder.pause();
      }

      const isConfirmed = await ModalSvc.confirm({
        header: 'Close camera',
        body: 'Proceeding will close the camera and discard any unsaved recording. Are you sure?',
      });

      if( isConfirmed ) {
        clearRecording();
        stopCamera();
        $scope.cameraIsOpened = false;
      }

    }

    async function setVideoDevices() {

      // The somewhat circular logic below is to evade a catch 22 situation with getUserMedia().
      // We'd like the user to be able to select the video device they want to use, but we can't supply them with options until we know the available devices.
      // The list of devices is unavailable until the user grants access.
      // getUserMedia() will ask the user for permission to use the webcam and load data about attached devices, but it also starts a stream with default constraints (settings such as resolution).
      // We stop this stream immediately so that we can later request another stream with the desired constraints based upon available device capability.
      // If we don't stop this stream, it will be a hanging reference and keep the camera active even after the user closes the directive.
      const stream = await $window.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach( track => track.stop() );

      const devices = await $window.navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices.filter( device => device.kind === 'videoinput' );
      console.log('videoDevices:', videoDevices);
      if ( videoDevices.length === 0 ) {
        ModalSvc.message( { header: 'Not found', body: 'No video devices found.' } );
        return;
      }

      vm.videoDevices = videoDevices;
      vm.selectedDevice = videoDevices[0];

    }

    async function startCamera() {

      const videoConstraints = [
        {
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { ideal: 16/9 },
        },
      ];

      const baseConstraints = {
        video: {
          deviceId: vm.selectedDevice ? { exact: vm.selectedDevice.deviceId } : undefined,
        }
      };

      for( let _videoConstraint of videoConstraints ) {

        const constraints = {
          video: Object.assign( {}, baseConstraints.video, _videoConstraint ),
        };

        console.log( `Trying video constraint:`, constraints );

        try {
          vm.currentStream = await $window.navigator.mediaDevices.getUserMedia( constraints );
          break;
        }
        catch ( error ) {
          console.error( error );
        }
      }


      if( vm.currentStream ) {
        console.log('vm.currentStream:', vm.currentStream);
        for( const track of vm.currentStream.getVideoTracks() ) {
          console.log( `Video track settings:`, track.getSettings() );
        }
      }
      else {
        ModalSvc.message( { header: 'Error', body: `Unable to retrieve video stream.` } );
      }
    }

    function stopCamera() {
      if ( vm.currentStream ) {
        vm.currentStream.getTracks().forEach( track => track.stop() || console.log('Track stopped:', track) );
        vm.currentStream = null;
      }
    }

    function clearRecording() {
      if( vm.mediaRecorder && vm.hasRecorded() ) {
        vm.mediaRecorder.stop();
      }
      vm.mediaRecorder = null;
      resetRecordingTimer();
    }

    function startRecording() {
      if ( vm.currentStream ) {

        const options = {
          mimeType: vm.videoCodec,
          videoBitsPerSecond: vm.videoBitRate
        };

        if( !vm.mediaRecorder ) {
          vm.mediaRecorder = new MediaRecorder( vm.currentStream, options );
          console.log( `MediaRecorder created:`, vm.mediaRecorder );
        }

        vm.mediaRecorder.start();
        startRecordingTimer();
      }
    }

    function saveLocalFile( blob, filename ) {
      // Create a Blob URL for the Blob object
      const url = $window.URL.createObjectURL(blob);

      // Create a link element and append to the document
      const a = $window.document.createElement('a');
      a.href = url;
      a.download = filename;
      $window.document.body.appendChild(a);

      // Programmatically click the link to trigger the download
      a.click();

      // Cleanup: remove the link from the document and revoke the Blob URL to release memory
      $window.document.body.removeChild(a);
      $window.URL.revokeObjectURL(url);

    }


    async function finishRecording() {

      if ( vm.mediaRecorder ) {

        vm.mediaRecorder.pause();

        const isConfirmed = await ModalSvc.confirm({
          header: 'Finish Recording',
          body: 'Finish the recording session and save the video?',
        });

        if( !isConfirmed ) {
          return;
        }

        const _chunks = [];

        vm.mediaRecorder.ondataavailable = async function(event) {

          if ( event.data.size > 0 ) {

            _chunks.push( event.data );

          }

          const blob = new Blob( _chunks, { type: 'video/mp4' } );
          const filename = `video-${ crypto.randomUUID() }.mp4`;
          const file = new File( [ blob ], filename, { type: blob.type, lastModified: Date.now() });

          const doSaveLocalFile = await ModalSvc.confirm({
            header: 'Save a local copy to your device?',
            html: `<p>In the event of a problem on the server, the video you have recorded may be lost.</p>
                    <p>It is therefore suggested that you save a local copy of this video to your device.</p>
                    <p>Would you like to save a copy?</p>`,
          });

          if( doSaveLocalFile ) {
            saveLocalFile( blob, filename );
          }

          await ModalSvc.wait({
            waitFor: $scope.uploadFn({ file })
          });

          await ModalSvc.message({
            header: 'Processing',
            body: 'The video has been uploaded and is currently processing. It may take some time before it is available for viewing.'
          });

        };
        vm.mediaRecorder.stop();

      }

    }

    function pauseRecording() {
      if ( vm.mediaRecorder ) {
        vm.mediaRecorder.pause();
        stopRecordingTimer();
      }
    }

    function resumeRecording() {
      if ( vm.mediaRecorder ) {
        vm.mediaRecorder.resume();
        startRecordingTimer();
      }
    }

    async function cancelRecording() {

      if ( vm.mediaRecorder ) {
        vm.mediaRecorder.pause();
      }

      const isConfirmed = await ModalSvc.confirm({
        header: 'Cancel Recording',
        body: 'Proceeding will discard the current recording session. Are you sure?',
      });

      if( isConfirmed ) {
        clearRecording();
      }

    }

    function resetRecordingTimer() {
      if( vm.recordingTimer ) {
        $interval.cancel( vm.recordingTimer );
      }
      vm.elapsedRecordingTimeSeconds = 0;
      vm.recordingTimer =  null;
    }

    function startRecordingTimer() {console.log('startRecordingTimer');
      vm.recordingTimer = $interval( function() {
        vm.elapsedRecordingTimeSeconds++;
      }, 1000 );
    }

    function stopRecordingTimer() {
      if( vm.recordingTimer ) {
        $interval.cancel( vm.recordingTimer );
      }
    }

  }
]);

