var Logger = require("logger");


kmptoolApp.controller('ProjectListCtrl'
    , [ "$scope", "kmpSvc", "$timeout"
    , function($scope, kmpSvc, $timeout) {
        
        $scope.projects = [
            {
                id: 1
                , name: "One"
            }
            , {
                id: 2
                , name: "Two"
            }
            , {
                id: 2
                , name: "Three"
            }
            , {
                id: 2
                , name: "Four"
            }
        ];
        
        $scope.deleteProject = function($event, project) {
            console.log($event);
            Logger.infoi("Delete ", project);
            
            $event.stopPropagation();
        }

        $scope.openProject = function($event, project) {
            console.log($event);
            Logger.infoi("Open ", project);

            $event.stopPropagation();
        }
    }])
