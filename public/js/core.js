var main = angular.module('main', ['ngRoute']);
main.config(['$routeProvider', function($routeProvider) {
	$routeProvider
		.when('/',
		{
			controller: 'HomepageController',
			templateUrl: 'views/partials/homepageLayout.html'
		}).when('/mcmaster',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/mcmasterSteps.html'
		}).when('/uottawa',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/uottawaSteps.html'
		}).when('/download/:calLink',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/downloadCalLayout.html'
		})
		.otherwise({redirectTo: '/'});
}]);

main.controller('HomepageController', ['$scope', '$http', function($scope, $http) {
	$scope.universities = [
		{name: 'McMaster', value: 'mcmaster'},
		{name:'UOttawa', value: 'uottawa'}
	];

	// Metrics stuff
	$scope.processedTotal = $scope.processedTotal || "N/A";
	var getMetrics = function() {
		$http({
			method: 'GET',
			url: '/metrics'
		}).then(function successCallback(data) {
					if (!data || !data.data) return;
					$scope.processedTotal = data.data.timetables_processed;
			}, function errorCallback(data) {
				console.log(data);
					$scope.processedTotal = $scope.processedTotal || "N/A";
			});
	};
	// Update metrics every 5 seconds
	setInterval(getMetrics, 5000);
	getMetrics();
}]);

main.controller('MainController', ['$scope', '$routeParams' ,'$http', '$location', function($scope,$routeParams, $http, $location) {
	$scope.uni = $location.path().substring(1);
	$scope.calLink = $routeParams.calLink;
	$scope.timetable = '';
	$scope.calEmail = '';

	$scope.setTimetable = function(timetable) {
		$scope.timetable = timetable;
	};

	$scope.process = function() {
		if (!$scope.uni) return;
		if (!$scope.timetable) {
			$scope.error = true;
			$scope.message = "No timetable provided!";
			return;
		}
		$scope.message = "Working hard to process your timetable!";
		$scope.loading = true;
		$scope.processing = true;
		$("#submitButton").prop('disabled', true);
		$http({
		  method: 'POST',
		  url: '/process',
			data: {
				'university': $scope.uni,
				'timetable': $scope.timetable,
				'calEmail': $scope.calEmail,
				'alarms': $scope.alarms
			}
		}).then(function successCallback(data) {
			if (!data || !data.data) return;
			$scope.loading = false;
			window.location.replace("#/download/"+ data.data.split('.')[0]);
		  }, function errorCallback(data) {
			$scope.processing = false;
			$("#submitButton").prop('disabled', false);
			$scope.message = data.data;
		  });
	};
}]);
