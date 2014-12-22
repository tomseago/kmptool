var Logger = require("logger");
var LoggerRingBuffer = require("logger-ring-buffer");
var ringBuffer = new LoggerRingBuffer({
    size: 50
});
// var StackTrace = require("stacktrace");

var ClientUtils = require("client-utils");
var DocCookies = require("doc-cookies");

Logger.DO_COLOR = false;

// Enable all semantic-ui dropdowns
$('.ui.dropdown').dropdown();


// // Monkey patch the string object
// /**
//  * @see http://stackoverflow.com/q/7616461/940217
//  * @return {number}
//  */
// String.prototype.hashCode = function(){
//     if (Array.prototype.reduce){
//         return this.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
//     } 
//     var hash = 0;
//     if (this.length === 0) return hash;
//     for (var i = 0; i < this.length; i++) {
//         var character  = this.charCodeAt(i);
//         hash  = ((hash<<5)-hash)+character;
//         hash = hash & hash; // Convert to 32bit integer
//     }
//     return hash;
// }



// Pollute the global namespace with our angular app. Kinda lame, but is what it is.
// This file is all about the global sort of things, by which I mostly mean the global
// service.
kmptoolApp = angular.module("kmptoolApp", [
    "ngRoute", "ngAnimate", "ngSanitize"
    ])
    .config([ "$provide", "$routeProvider", "$filterProvider", function($provide, $routeProvider, $filterProvider) {

        // An exception handler that is more better. Have to use the injector directly so we don't loop
        // on ourself
        $provide.decorator("$exceptionHandler", ["$delegate", "$injector", function($delegate, $injector) {
            return function(exception, cause) {
                var kmpSvc = $injector.get("kmpSvc");
                kmpSvc.showException(exception, cause);
                $delegate(exception, cause);
            }
        }]);


        $routeProvider.when('/start', {
            templateUrl : 'html/start.html'
            , controller : "StartCtrl"

        // }).when('/newUser', {
        //     templateUrl : 'html/new-user.html'
        //     , controller : "NewUserCtrl"


        }).otherwise({
            redirectTo : '/start'
        });


        // $filterProvider.register("mpFormattedDate", function() {
        //     return function(num) {
        //         return moment(num).format("MMM Do YYYY, h:mm a");                
        //     }
        // });

        // $filterProvider.register("mpPrioritySorted", function() {
        //     return function(list) {
        //         if (Array.isArray(list)) {
        //             var ar = list.slice(0);
        //         } else {
        //             // Assume a hash
        //             var ar = [];
        //             for(var ix in list) {
        //                 if (ix == "_id" || ix == "_priority") continue;
        //                 ar.push(list[ix]);
        //             }
        //         }

        //         ar.sort(function(a,b) {
        //             var pA = a ? (a._priority || 0) : 0;
        //             var pB = b ? (b._priority || 0) : 0;
        //             return pA - pB;
        //         });

        //         return ar;
        //     }
        // });

        // $filterProvider.register("mpKeysOnly", function() {
        //     return function(obj) {
        //         var list = [];
        //         for (var id in obj) {
        //             if (typeof id == "string" && id[0]=="_") continue;
        //             list.push(id);
        //         }
        //         return list;
        //     }
        // });

        // $filterProvider.register("mpHasField", function() {
        //     return function(input, fieldName) {
        //         var out = [];
        //         for (var id in input) {
        //             if (typeof id == "string" && id[0]=="_") continue;
        //             var obj = input[id];
        //             if (obj[fieldName]) {
        //                 out.push(obj);
        //             }
        //         }
        //         return out;
        //     }
        // });


    } ])

    // --------------------------------------------------------------------------------------------------
    //   A central service for the app

    .factory('kmpSvc', 
        ["$animate", "$rootScope", "$location", "$timeout", "$http", "$route", "$injector"
        , function($animate, $rootScope, $location, $timeout, $http, $route, $injector) {

        // Used to handle automatic reloads more quietly
        var ignoreRouteChangeError = false;

        Logger.info("kmpSvc factory");


        function showMessage(msg, isError) {
            $timeout(function() {
                Logger.debugi("Showing message ", msg);            
                $rootScope.gGeneralMessage = msg;

                $(".general.message").sidebar("show");
                if (isError) {
                    $(".general.message .message").addClass("red");
                } else {
                    $(".general.message .message").removeClass("red");                
                }
                setTimeout(function() {
                    $(".general.message").sidebar("hide");
                }, 3000);
            });
        }

        function showError(err) {
            if (!err) return false;

            Logger.errori(err);

            var text = err.message || err.toString();
            showMessage(text, true);

            return true;
        }

        ///////////////////////////////////////////////////////////////
        function localSet(key, value) {
            if (localStorage) {
                localStorage.setItem(key, value);
            } else {
                DocCookies.setItem(key, value, Infinity);
            }
        }

        function localGet(key) {
            if (localStorage) {
                return localStorage.getItem(key);
            } else {
                return DocCookies.getItem(key);
            }
        }
        
        ///////////////////////////////////////////////////////////////
        function getAgent() {
            if (!navigator) {
                return "no-navigator";
            }
            if (!navigator.userAgent) {
                return "no-user-agent";
            }
            return navigator.userAgent;
        }

        function getFingerprint() {
            var fp = localGet("finger");
            if (fp) return fp;

            // Have to make it
            fp = ClientUtils.uuid();
            localSet("finger", fp);
            return fp;
        }

        function _reportException(ex, x) {
            try {
                var trace = null
                try {
                    trace = StackTrace({e:ex});
                } catch (e) {
                    // ignore
                }

                var report = {
                    msg: x.headline
                    , cause: x.cause
                    , log: ringBuffer.copyContent()
                    , uuid: x.uuid
                    , trace: trace                 
                };
                if (mixpanel && mixpanel.get_distinct_id) {
                    report.mixpanel = mixpanel.get_distinct_id();
                }
                report.agent = getAgent();
                report.fingerprint = getFingerprint();

                // Don't care about success or fail
                // api("/log/exception", report);
            } catch (e) {
                // Ignore...
            }
        }

        var reportException = _.throttle(_reportException, 500, {leading:true, trailing:true});

        function showException(ex, cause) {

            var exObj = {
                headline: ex.message
                , cause: cause
                , uuid: ClientUtils.uuid()
            }
            if (!$rootScope.gExceptions) {
                $rootScope.gExceptions = [];
            }
            
            var x = {
                uuid: exObj.uuid
            }
            if (exObj.headline && exObj.headline.toString) {
                x.headline = exObj.headline.toString();
            }
            if (exObj.cause && exObj.cause.toString) {
                x.cause = exObj.cause.toString();
            }
            aTrack("error.guru.meditation", x);

            $timeout(function() {
                $rootScope.gExceptions.push(exObj);
            });

            reportException(ex, x);         
        }
        dbgShowException = showException;

        $rootScope.removeException = function(ex) {
            if ($rootScope.gExceptions) {
                var ix = $rootScope.gExceptions.indexOf(ex);
                $rootScope.gExceptions.splice(ix, 1);
            }
        }

        $rootScope.$on("$routeChangeSuccess", function(err) {
            aTrack("route.change.success", {
                controller: $route.current.controller
                , path: $location.path()
            })
        });

        $rootScope.$on("$routeChangeError", function(evt, err) {
            if (ignoreRouteChangeError) return;
            Logger.errori(err);
            showException(new Error("Error communicating with the server.", "$routeChangeError"));
        });





        /////////////////////////////////////////////////////////////////////////////////////
        //
        // Analytics

        function aTrack(name, props) {
            // Standardize names???

            Logger.debug("Analytics Event [",name,"] = ", JSON.stringify(props));

            // Tell Mixpanel
            // mixpanel.track("mp."+name, props);
        }

        // function aUserId(id, justCreated) {
        //     if (justCreated) {
        //         mixpanel.alias(id);
        //     } else {
        //         mixpanel.identify(id);
        //     }

        //     // Also set a super parameter
        //     if (justCreated) {
        //         mixpanel.register("userJustCreated", true);
        //     } else {
        //         mixpanel.unregister("userJustCreated");
        //     }

        // }

        // function aUserInfo(info) {
        //     var forMix = {};
        //     if (info.name) {
        //         forMix.name = info.name;
        //     }
        //     if (info.email) {
        //         forMix.$email = info.email;
        //     }

        //     mixpanel.people.set(forMix);
        // }


        /////////////////////////////////////////////////////////////////////////////////////
        //
        // Return the public functions

        return {
            showMessage: showMessage
            , showError: showError
            , showException: showException

            , aTrack: aTrack
            // Don't expose the other analytics things because they all happen inside here
        }
    }])

    // Needed to make modals go away properly
    .directive("kmpRemoveOnScopeDeath", function() {
        return function($scope, element, attrs) {

            Logger.infoi("Remove on scope death init");

            $scope.$on("$destroy", function() {
                Logger.infoi(" -- mpRemoveOnScopeDeath -- ")
                element.remove();
            });
        }
    })

    .directive("kmpEnableDropdown", function() {
        return function($scope, element, attrs) {
            var options = $scope.$eval(attrs.mpEnableDropdown);            
            element.dropdown(options);
        }
    })

    .directive("kmpAddToScope", function() {
        return function($scope, element, attrs) {
            // Logger.errori("Add to scope as ", attrs.mpAddToScope);
            $scope[attrs.mpAddToScope] = element;
        }
    })

    .directive("kmpAddToParentScope", function() {
        return function($scope, element, attrs) {
            // Logger.infoi("Add to parent scope as ", attrs.mpAddToScope);
            $scope.$parent[attrs.mpAddToScope] = element;
        }
    })




    // --------------------------------------------------------------------------------------------------
    //   The most basic of the controllers. Not sure this is really used, but let's say that it is....

    .controller("AppCtrl", ["$scope", function($scope) {

        $scope.globalLoadingCount = 0;

    }])


    .constant('keyCodes', {
        esc: 27,
        space: 32,
        enter: 13,
        tab: 9,
        backspace: 8,
        shift: 16,
        ctrl: 17,
        alt: 18,
        capslock: 20,
        numlock: 144
    })
    .directive('kmpKeyBind', ['keyCodes', function (keyCodes) {
        function map(obj) {
            var mapped = {};
            for (var key in obj) {
                var action = obj[key];
                if (keyCodes.hasOwnProperty(key)) {
                    mapped[keyCodes[key]] = action;
                }
            }
            return mapped;
        }

        return function (scope, element, attrs) {
            var bindings = map(scope.$eval(attrs.keyBind));
            element.bind("keydown", function (event) {
                if (bindings.hasOwnProperty(event.which)) {
                    scope.$apply(function() {
                         scope.$eval(bindings[event.which]);
                    });
                }
            });
        };
    }])


    
