var Logger = require("logger");


kmptoolApp.controller('ProjectListCtrl'
    , [ "$scope", "kmpSvc", "$timeout", "kmpData"
    , function($scope, kmpSvc, $timeout, kmpData) {
        
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
        
        $scope.openNewDialog = function() {
            $(".project-new.ui.modal").modal("show");
        }
        
    }])
