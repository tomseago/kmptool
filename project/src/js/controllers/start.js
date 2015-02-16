var Logger = require("logger");


kmptoolApp.controller('StartCtrl'
    , [ "$scope", "kmpSvc", "$timeout"
    , function($scope, kmpSvc, $timeout) {
        
        Logger.info("StartCtrl factory");
        $scope.startMsg = "Hello from Angular";

        // $timeout(function() {
        //     Logger.info("Launching timed message");
        //     kmpSvc.showMessage("This is a message");
        // }, 2000);
    }])
