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
		}).when('/:uni/cal',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/downloadCalLayout.html'
		})
		.otherwise({redirectTo: '/'});
}]);


main.controller('MainController', ['$scope', '$routeParams' ,'$http', function($scope,$routeParams, $http) {
	$scope.uni = $routeParams.uni;
	$scope.timetable = '';
	$scope.calEmail = '';
	$scope.universities = [
		{name: 'McMaster', value: 'mcmaster'},
		{name:'UOttawa', value: 'uottawa'}
	];

	$scope.setTimetable = function(timetable) {
		$scope.timetable = timetable;
	}

	$scope.process = function() {
		$scope.message = "Working hard on getting you your file!";
		$http({
		  method: 'POST',
		  url: '/process',
			data: {
				'university': $scope.uni,
				'timetable': $scope.timetable,
				'calEmail': $scope.calEmail
			}
		}).then(function successCallback(data) {
				var anchor = angular.element('<a><span class="glyphicon glyphicon-download" aria-hidden="true"></span> Download</a>');
				anchor.attr({
							href: '/ics/' + data,
							target: '_blank'
					});
					anchor.addClass('btn');
					anchor.addClass('submitBtn');
				anchor.addClass("btn-default");
				$("#downloadDiv" ).empty();
					var div = angular.element(document).find('#downloadDiv').eq(0);
				$( "#submitButton" ).prop('disabled', false);

				div.append(anchor);
				var share = angular.element('<p style="margin-top:10px;" id="share">Share link with friends or Share on Social Media <b>(Link is only stored for a limited time)</b>: </p>');
				div.append(share);
				div.append('www.coursity.me/ics/' + data);
				var social1 = angular.element('<a style="color: #ffffff; padding: 5px;"><i class="fa fa-facebook-square fa-2x"></i></a>');
				var social2 = angular.element('<a style="color: #ffffff; padding: 5px;"><i class="fa fa-twitter-square fa-2x"></i></a>');
				social1.attr({
					href: 'https://www.facebook.com/sharer/sharer.php?u=www.coursity.me/ics/' + data,
					target: '_blank'
				});

				social2.attr({
					href: 'https://twitter.com/home?status=Hey!%20just%20added%20my%20course%20schedule%20to%20my%20devices%20using%20Coursity!%20Check%20it%20out%20www.coursity.me/ics/' + data + " and%20check%20out%20the%20site%20at%20www.coursity.me",
					target: '_blank'
				});
				div.append(social1);
				div.append(social2);
				$scope.message = 'Finished.';
		  }, function errorCallback(data) {
				$("#submitButton").prop('disabled', false);
				$scope.message = data;
		  });
	};
}]);
