var main = angular.module('main', ['ngRoute']);
//var domain = document.URL
main.config(['$routeProvider', function($routeProvider) {
	$routeProvider
		.when('/',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/homepageLayout.html'
		}).when('/:uni',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/pasteTextLayout.html'
		}).when('/downloadCal/:calLink',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/downloadCalLayout.html'
		})
		.otherwise({redirectTo: '/'});
}]);


main.controller('MainController', ['$scope', '$routeParams' ,'$http', function($scope,$routeParams, $http) {
	$scope.uni = $routeParams.uni;
	$scope.calLink = $routeParams.calLink;
	$scope.timetable = '';
	$scope.calEmail = '';
	$scope.universities = [
		{name: 'McMaster', value: 'mcmaster'},
		{name:'UOttawa', value: 'uottawa'}
	];

	$scope.setTimetable = function(timetable) {
		$scope.timetable = timetable;
	};

	$scope.process = function() {
		$scope.message = "Working hard to get your file!";
		$scope.loading = true;
		$scope.processing = true;
		$("#submitButton").prop('disabled', true);
		$http({
		  method: 'POST',
		  url: '/process',
			data: {
				'university': $scope.uni,
				'timetable': $scope.timetable,
				'calEmail': $scope.calEmail
			}
		}).then(function successCallback(data) {
			$scope.loading = false;
			window.location.replace("#/downloadCal/"+ data.data);
		  }, function errorCallback(data) {
			$scope.processing = false;
			$("#submitButton").prop('disabled', false);
			$scope.message = data.data;
		  });
	};
}]);
