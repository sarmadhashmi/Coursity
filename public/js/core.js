var main = angular.module('main', ['ngRoute', 'ngFileUpload']);

main.config(['$routeProvider', function($routeProvider) {
	$routeProvider
		.when('/',	
		{
			controller: 'MainController',
			templateUrl: 'views/partials/uploadFileForm.html'
		})
		.otherwise({redirectTo: '/'});
}]);


main.controller('MainController', ['$scope', '$http', 'Upload', function($scope, $http, Upload) {

	$scope.upload = function(files) {	
		if (files && files.length > 0) {
			Upload.upload({
					url: '/upload',
					file: files[0]				
				})
				.progress(function(evt) {
					var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
		            $scope.message = 'Progress: ' + progressPercentage + '% ' + evt.config.file.name;
				})
				.success(function(data) {
					$scope.message = data;
				})
		}
	}

}]);