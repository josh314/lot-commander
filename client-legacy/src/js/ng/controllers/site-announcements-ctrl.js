import angular from 'angular';

/******************* Site Announcements Management Page Controller *************************/
angular.module('myApp').controller( 'SiteAnnouncementsCtrl', [

  'ModalSvc',
  'SiteAnnouncementsSvc',

  function(

    ModalSvc,
    SiteAnnouncementsSvc,

  ) {

    class DisplayAnnouncement {

      constructor( announcement ) {

        Object.assign( this, announcement );

      }

      startEditing() {
        this.isEditing = true;
        this.edits = Object.assign( {}, this );
      }

      cancelEditing() {
        this.isEditing = false;
      }

      async saveEdits() {

        const isValid = await validateAnnouncement( this.edits );

        if( !isValid ) {
          return;
        }

        try {
          await ModalSvc.wait({
            waitFor: SiteAnnouncementsSvc.edit( this._id, this.edits )
          });

          Object.assign( this, this.edits );
          this.isEditing = false;
          refreshAnnouncements();
        }
        catch(e) {
          await ModalSvc.message( { header: 'Error', body: "Server error" } );
        }

      }

    }

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          announcements: [],

          previewAnnouncement,
          displayAnnouncement,
          createAnnouncement,
          deleteAnnouncement,
          editAnnouncement,

        }
      );

      initNewAnnouncement();
      refreshAnnouncements();
    }

    function refreshAnnouncements() {

      SiteAnnouncementsSvc.list().then( ( { announcements } ) => {
        vm.announcements = announcements.map( a => new DisplayAnnouncement( a ) );
      });

    }

    async function validateAnnouncement( announcement ) {

      if( !announcement.header || !announcement.body || (typeof announcement.isActive !== 'boolean') ) {
        return ModalSvc.message( { header: "Error", body: "All fields are required" } ).then( () => false );
      }

      return true;
    }

    async function deleteAnnouncement( announcement ) {

      const isConfirmed = await ModalSvc.confirm( {
        header: 'Confirm',
        body: 'Are you sure you want to delete this announcement?',
      });

      if( isConfirmed ) {

        try {
          await ModalSvc.wait({
            waitFor: SiteAnnouncementsSvc.remove( announcement._id )
          });

          refreshAnnouncements();
        }
        catch(e) {
          await ModalSvc.message( { header: 'Error', body: "Server error" } );
        }

      }

    }

    async function createAnnouncement() {

      const isValid = await validateAnnouncement( vm.newAnnouncement);

      if( !isValid ) {
        return;
      }

      const resp = await ModalSvc.wait({
        waitFor: SiteAnnouncementsSvc.create( vm.newAnnouncement )
      });

      if( resp.error ) {
        await ModalSvc.message( { header: "Error", body: resp.message } );
      }
      else {
        await ModalSvc.message( { header: "Success", body: "New announcement successfully created." } );
        initNewAnnouncement();
        refreshAnnouncements();
      }

    }

    function initNewAnnouncement() {
      vm.newAnnouncement = {
        isActive: false
      };
    }

    async function editAnnouncement( announcement ) {
      announcement.startEditing();
    }

    function displayAnnouncement( announcement ) {
      SiteAnnouncementsSvc.display( announcement );
    }

    function previewAnnouncement() {
      displayAnnouncement( vm.newAnnouncement );
    }


  }
]);
