var main = angular.module('main', ['ngRoute', 'ngFileUpload']);
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


main.controller('MainController', ['$scope', '$routeParams' ,'$http', 'Upload', function($scope,$routeParams, $http, Upload) {
	$scope.uni = $routeParams.uni;
	$scope.universities = [
		{name: 'Example', value: 'example'},
		{name: 'McMaster', value: 'mcmaster'}, 
		{name:'UOttawa', value: 'uottawa'}
	];

	$scope.upload = function(files) {
		if (files && files.length > 0) {
			Upload.upload({
					url: '/upload',
					file: files[0],
					fields: {
						'university': $scope.university, 
						'semester': $scope.semester,
						'calEmail': $scope.calEmail,
					}
				}) 
				.progress(function(evt) {
					$( "#submitButton" ).prop('disabled', true);
		            $scope.message = 'Uploading and converting';
				})
				.success(function(data) {
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
				})
				.error(function(data) {
					$("#submitButton").prop('disabled', false);
					$scope.message = data;
				});
		}
	};

	$scope.feedback = function() {
		$http.post('/feedback', { "email": $scope.email, "message": $scope.messageFeedback, "recaptcha": document.getElementById("g-recaptcha-response").value })
		.success(function(data, status, headers, config) {
    		$scope.feedbackMessage = 'Thank you!';
		}).error(function(data, status, headers, config) {			
    		$scope.feedbackMessage = data;
		});
	};

	$scope.$on('$viewContentLoaded', function ()
	{
		 // Angular JS Page Edits
		/*$.getScript( "../slick/slick.min.js" )
			.done(function( script, textStatus ) {
				console.log( textStatus );
			})
			.fail(function( jqxhr, settings, exception ) {
				$( "div.log" ).text( "Triggered JS handler." );
			});*/
		$(document).ready(function(){
			$.getScript( "https://www.google.com/recaptcha/api.js" );
			$(this).scroll(function() {
				var st = $(this).scrollTop();
				if (st > 300) {
					$("header").css("background-color", "#56793d");
					$('#sidebar-wrapper').css('top', '0px');
					$('#small-logo').show();

				} else {
					$("header").css("background-color", "transparent");
					$("header").css("transition", "background-color 0.5s");
					$('#sidebar-wrapper').css('top', '0px');
					$('#small-logo').hide();


				}
				});


			$('#mainBody').on('change', '#uniChoose', function() {
				var uni = $scope.uni;
				window.location.replace("#/"+ uni);
				$('#homeDiv').fadeOut(300, function() {
					$('#homeDiv').css({
						"background-image": "url('../img/" + uni + ".jpg')"
					}).fadeIn(400);
				});
			});
		});
	});
}]);

