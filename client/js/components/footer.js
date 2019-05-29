import app from '../ng-app';

/*********************** Footer Directive ***********************/
app.directive('footerDirective', function(){
  return {
    restrict: 'A',
    replace: true,
    templateUrl: '/partials/_footer.html',
  };
});
