var Logger = require("logger");

var Part = require("stored-objects/part");
var Project = require("stored-objects/project");
var Ship = require("stored-objects/ship");
var Stage = require("stored-objects/stage");
var ShipPart = require("stored-objects/ship-part");


kmptoolApp.controller('ShipListCtrl'
    , [ "$scope", "kmpSvc", "$timeout", "kmpData"
    , function($scope, kmpSvc, $timeout, kmpData) {

        function loadShips() {
            if (!$scope.gCurrentProject) {
                Logger.infoi("Can not load ships because there is no current project");
                return;
            }
            
            Logger.infoi("Loading ships for "+$scope.gCurrentProject.name);
            
            Ship.forProject($scope.gCurrentProject).toArray()
                .then(function(list) {
                    
                    list.sort(function(a,b) {
                        //return a.order - b.order;
                        aname = a.name.toLowerCase();
                        bname = b.name.toLowerCase();
                        if (aname > b.name) return 1;
                        if (aname < bname) return -1;
                        return 0;
                    });
                    
                    Logger.infoi("Got list of ships ",list);
                    $timeout(function() {
                        $scope.ships = list;
                    });
                })
                .catch(function(err) {
                    kmpSvc.showError(err);
                });
        }
        
        loadShips();
        $scope.$watch("gCurrentProject", loadShips);


        $scope.selectShip = function(ship) {
            
        }

        $scope.deleteShip = function(ship) {
            
        }

        $scope.addNewShip = function() {
            
            Logger.infoi("Add ship");
            
            if (!$scope.gCurrentProject) {
                kmpSvc.showError("Can not add a ship without a current project");
                return;
            }
            
            var name = ($scope.newShipName || "").trim();
            if (!name) {
                Logger.infoi("Ignoring add ship because name is null");
                return;
            }

            var newShip = new Ship($scope.gCurrentProject);
            newShip.name = name;
            newShip.save().then(function() {
                loadShips();
                $timeout(function() {
                    $scope.newShipName = "";
                });
            });
        }

    }])
