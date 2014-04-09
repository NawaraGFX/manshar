'use strict';

// TODO(mkhatib): Seperate these into config/routes.js and
// config/interceptors/httpInterceptors.js and add tests for them.
// TODO(mkhatib): Move the autogenerated appConfig.js to config/constants.js.

angular.module('webClientApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'AppConfig',
  'truncate',
  'snap',
  'angulartics',
  'angulartics.google.analytics',
  'angularFileUpload'
])
  /**
   * Routing.
   */
  .config(['$routeProvider',
      function ($routeProvider) {

    /**
     * Checks proper access to the route and reject it if unauthenticated.
     */
    var checkAccess = function(config) {
      return {
        load: ['$q', '$location', 'LoginService', function($q, $location, LoginService) {
          if(LoginService.isAuthorized(config.isPublic)) {
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
          } else {
            return $q.reject({
              redirectTo: '/login',
              previous: $location.path()
            });
          }
        }]
      };
    };


    $routeProvider

      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        title: 'منصة النشر العربية',
        resolve: checkAccess({
          isPublic: true
        })
      })

      .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl',
        title: 'تسجيل الدخول',
        resolve: checkAccess({
          isPublic: true
        })
      })

      .when('/signup', {
        templateUrl: 'views/signup.html',
        controller: 'SignupCtrl',
        title: 'مستخدم جديد',
        resolve: checkAccess({
          isPublic: true
        })
      })

      .when('/articles/new', {
        templateUrl: 'views/articles/edit.html',
        controller: 'EditArticleCtrl',
        title: 'مقال جديد',
        resolve: checkAccess({
          isPublic: false
        })
      })

      .when('/articles/:articleId/edit', {
        templateUrl: 'views/articles/edit.html',
        controller: 'EditArticleCtrl',
        resolve: checkAccess({
          isPublic: false
        })
      })

      .when('/articles/:articleId', {
        templateUrl: 'views/articles/show.html',
        controller: 'ArticleCtrl',
        resolve: checkAccess({
          isPublic: true
        })
      })

      .otherwise({
        redirectTo: '/'
      });
  }])
  /**
   * Intercept every http request and check for 401 Unauthorized
   * error. Clear the current user and redirect to /login page.
   */
  .config(['$httpProvider', '$locationProvider', function ($httpProvider, $locationProvider) {
    var unAuthenticatedInterceptor = ['$location', '$q', function ($location, $q) {

      var success = function (response) {
        return response;
      };

      var error = function (response) {
        if (response.status === 401) {
          $location.path('/login');
          return $q.reject(response);
        }
        else {
          return $q.reject(response);
        }
      };

      return function (promise) { return promise.then(success, error); };
    }];
    $httpProvider.responseInterceptors.push(unAuthenticatedInterceptor);
    // $httpProvider.defaults.headers.common['Content-Type'] = 'application/json';

    $locationProvider.hashPrefix('!');
  }])
  /**
   * Everytime the route change check if the user need to login.
   */
  .run(['$location', '$rootScope', '$analytics', 'LoginService', 'GA_TRACKING_ID',
      function ($location, $rootScope, $analytics, LoginService, GA_TRACKING_ID) {

    // ga is the Google analytics global variable.
    if (window.ga) {
      ga('create', GA_TRACKING_ID);
    }

    /**
     * Holds data about page-wide attributes. Like pages title.
     */
    $rootScope.page = {
      title: 'منصة النشر العربية',
      description: 'منصة نشر متخصصة باللغة العربية مفتوحة المصدر',
      image: 'http://' + document.location.host + '/images/manshar@200x200.png'
    };

    /**
     * Logs the user out.
     */
    $rootScope.logout = function () {
      $analytics.eventTrack('Logout', {});
      LoginService.logout();
    };

    /**
     * Returns true if the passed user is the same user that is referenced
     * in the resource. This assumes that the resource always have a user
     * property, otherwise it'll return false.
     * @param {Object} user The object representing the user data.
     * @param {Object} resource The object representing the resource (e.g. Article).
     * @returns {boolean} true if the user is the owner of the resource.
     */
    $rootScope.isOwner = function (user, resource) {
      return (!!user && !!resource && !!resource.user &&
              user.id === resource.user.id);
    };

    // If the user is already logged in init the auth headers.
    // This also makes isLoggedIn and currentUser available on rootScope.
    LoginService.init();

    // Listen to $routeChangeError and redirect the user.
    $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
      if(rejection && rejection.redirectTo) {
        $analytics.eventTrack('Unauthorized', {
          category: 'errors',
          label: rejection.previous
        });
        $location.path(rejection.redirectTo).search('prev', rejection.previous);
      }
    });

    $rootScope.$on('$routeChangeSuccess', function (event, current) {
      $rootScope.page.title = current.$$route.title || $rootScope.page.title;
      $rootScope.page.url = document.location.href;
    });

  }]);
