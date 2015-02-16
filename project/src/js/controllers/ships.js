var Logger = require("logger");

var Part = require("stored-objects/part");
var Project = require("stored-objects/project");
var Ship = require("stored-objects/ship");
var Stage = require("stored-objects/stage");
var ShipPart = require("stored-objects/ship-part");


kmptoolApp.controller('ShipsCtrl'
    , [ "$scope", "kmpSvc", "$timeout", "kmpData", "$rootScope"
    , function($scope, kmpSvc, $timeout, kmpData, $rootScope) {

        $(".ships.page .ship-list.sidebar")
            .sidebar({
                context: ".ships.page"
            })
            .sidebar("setting", "transition", "uncover")
            .sidebar("attach events", ".ships.page .ui.launch.button");
       
       $scope.selectShip = function(ship) {
           $scope.currentShip = ship;
           
       }
        
    }])
