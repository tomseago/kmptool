var Logger = require("logger");


kmptoolApp.controller('TopBarCtrl'
    , [ "$scope", "kmpSvc", "$timeout", "kmpData"
    , function($scope, kmpSvc, $timeout, kmpData) {

        var dropdownEl = $("#topBar .projects.dropdown");
        
         function dropdownAction(text, value) {
            Logger.info("text='",text+"'  value='",value,"'");
            
            if (value=="__NEW_PROJECT__") {
                // Open the dialog
                $("#topBar .project-new.ui.modal").modal("show");
            } else if (value=="__SEE_ALL__") {
                kmpSvc.gotoPage("/projectList");
            } else {
                // select that project as the current one
                
                $timeout(function() {
                    kmpSvc.setCurrentProjectById(value);
                });
            }
            
            dropdownEl.dropdown("hide");
        }

            dropdownEl.dropdown({
                action: dropdownAction
                , debug: true
            })
        // function updateDropdown() {
        //     $timeout(function() {
        //         dropdownEl.dropdown("refresh")
        //     }, 20);
        // }
        // updateDropdown();
        
        $scope.createProject = function() {
            var name = ($scope.newProjectName || "").trim();
            
            if (!name.length) {
                kmpSvc.showError("Projects must have a name");
                return;
            }
            
            kmpData.createProject(name, function(err, proj) {
                if (err) {
                    kmpSvc.showError(err);
                    return;
                }
                
                // Set the project as the new current one in the browser and when the
                // projects are reloaded by kmpSvc it will be set as current
                kmpSvc.localSet("currentProjectId", proj.id);
            });
        }
        
        // $scope.$watch("gCurrentProject", updateDropdown);
        // $scope.$watchCollection("gProjects", updateDropdown);
    }])
