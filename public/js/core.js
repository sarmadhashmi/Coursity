var main = angular.module('main', ['ngRoute', 'ngFileUpload']);
//var domain = document.URL
main.config(['$routeProvider', function($routeProvider) {
	$routeProvider
		.when('/',
		{
			controller: 'MainController',
			templateUrl: 'views/partials/homepageLayout.html'
		})
		.otherwise({redirectTo: '/'});
}]);


main.controller('MainController', ['$scope', '$http', 'Upload', function($scope, $http, Upload) {
	$scope.universities = [
		{name: 'Example', value: 'example'},
		{name: 'McMaster', value: 'mcmaster'}, 
		{name:'UOttawa', value: 'uottawa'}
	];
	$scope.semesterList = [
		{ name: 'Fall 2015', value: 'fall' }, 
		{ name: 'Winter 2016', value: 'winter' },
		{ name: 'Summer 2016', value: 'summer' }, 
		{ name: 'Spring 2016', value: 'spring' }, 
		{ name: 'Summer/Spring 2016', value: 'springsummer' }
	];

	$scope.upload = function(files) {
		if (files && files.length > 0) {
			Upload.upload({
					url: '/upload',
					file: files[0],
					fields: {
						'university': $scope.university, 
						'semester': $scope.semester
					}
				}) 
				.progress(function(evt) {					
		            $scope.message = 'Uploading and converting';
				})
				.success(function(data) {
					var anchor = angular.element('<a/>');
     				anchor.attr({
         				href: 'data:attachment/html;charset=utf-8,' + encodeURI(data),
         				target: '_blank',
         				download: 'timetable.ics'
     				})[0].click();
     				$scope.message = 'Finished.';
				})
				.error(function(data) {
					$scope.message = data;
				});
		}
	};

	$scope.feedback = function() {					
		$http.post('/feedback', { "email": $scope.email, "message": $scope.messageFeedback })
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

			$(this).scroll(function() {
				var st = $(this).scrollTop();
				if (st > 300) {
					$("header").css("background-color", "#56793d");
					$('#sidebar-wrapper').css('top', '70px');
				} else {
					$("header").css("background-color", "transparent");
					$("header").css("transition", "background-color 0.5s");
					$('#sidebar-wrapper').css('top', '0px');					

				}
				})


			$('.single-item').slick({
				dots: true,
				infinite: true,
				speed: 300,
				slidesToShow: 1,
				slidesToScroll: 1,
				lazyLoad:'ondemand'
				//autoplay: true,
				//autoplaySpeed: 1000
			});

		    // Opens the sidebar menu
		    $("#menu-toggle").click(function(e) {
		        e.preventDefault();
		        $("#sidebar-wrapper").toggleClass("active");
		    });

		    $('.menu1, #goToHowTo').click(function(e) {
		    	e.preventDefault();
		    	$('html,body').animate({
                        scrollTop: $($(this).attr('href')).offset().top
                    }, 500);                    
            });

			$("#mcmaster").hide();
			$("#example").show();
			$("#uottawa").hide();
			$('#mainBody').on('change', '#uniChoose', function() {
				//window.location.anchor("#unichoose");
				if ($(this).val() == 'mcmaster') {
					$('.homeDiv').css({"background-image": "url('../img/McMaster_University.jpg')"}).fadeIn("slow");
					$("#example").hide();
					$("#uottawa").hide();
					$("#mcmaster").show();
				}
				if ($(this).val() == 'uottawa') {
					$('.homeDiv').css({"background-image": "url('../img/McMaster_University.jpg')"}).fadeIn("slow");
					$("#example").hide();
					$("#mcmaster").hide();
					$("#uottawa").show();
				}
				if ($(this).val() == 'example') {
					$("#example").show();
					$("#uottawa").hide();
					$("#mcmaster").hide();
				}
			});
		});
	});
}]);

