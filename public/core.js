var mainModule = angular.module('mainModule', ['ngRoute']);

mainModule.config(['$routeProvider', function($routeProvider) {
	$routeProvider
		.when('/home')	
		{
			controller: 'MainController',
			partials: 'html/partials/home.html'
		}
		.otherwise({redirectTo: '/home'});
}]);

mainModule.