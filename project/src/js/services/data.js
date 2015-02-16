var Logger = require("logger");

var Dexie = require("dexie");

var StoredObject = require("stored-objects/stored-object");
var Part = require("stored-objects/part");
var Project = require("stored-objects/project");
var Ship = require("stored-objects/ship");
var Stage = require("stored-objects/stage");
var ShipPart = require("stored-objects/ship-part");

kmptoolApp
    .factory('kmpData', 
        [ "$rootScope"
        ,function($rootScope) {
            
            var db = new Dexie("kmptool");
            
            var stores = {
                parts: Part.indexSpec
                , projects: Project.indexSpec
                , ships: Ship.indexSpec
                , stages: Stage.indexSpec
                , shipParts: ShipPart.indexSpec
            };
            Logger.infoi("Stores is ", stores);
            db.version(15021403).stores(stores);
            

            // Map instances into static objects
            StoredObject.prototype.db = db;
            
            Part.prototype.table = db.parts;
            db.parts.mapToClass(Part, Part.classSpec);
            
            Project.prototype.table = db.projects;
            db.projects.mapToClass(Project, Project.classSpec);
            
            Ship.prototype.table = db.ships;
            db.ships.mapToClass(Ship, Ship.classSpec);
            
            Stage.prototype.table = db.stages;
            db.stages.mapToClass(Stage, Stage.classSpec);

            ShipPart.prototype.table = db.shipParts;
            db.shipParts.mapToClass(ShipPart, ShipPart.classSpec);
            
            function checkEnvironment(cb) {
                db.open().then(cb).catch(function(err) {
                    cb(err);
                });
            }
            
            function getProjects(cb) {
                db.projects.toArray().then(
                    function(data) {
                        cb(null, data);
                    }
                    , function(err) {
                        cb(err);
                    }
                );
            }
            
            function createProject(name, cb) {
                var proj = new Project();
                
                proj.name = name;
                
                proj.save().then(
                // db.projects.add({name:name}).then(
                    function(data) {
                        Logger.infoi("Data is ", data);
                        proj.id = data;
                        cb(null, proj);
                        $rootScope.$emit("kmpProjectsChanged");
                    }
                    , function(err) {
                        cb(err);
                    }
                );
            }
            
            return {
                checkEnvironment: checkEnvironment
                , getProjects: getProjects
                
                , createProject: createProject
            }            
            
            // var db = null;
            
            // function checkEnvironment(cb) {
            //     // In the following line, you should include the prefixes of implementations you want to test.
            //     window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
            //     // DON'T use "var indexedDB = ..." if you're not in a function.
            //     // Moreover, you may need references to some window.IDB* objects:
            //     window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
            //     window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
                
            //     if (!window.indexedDB) {
            //         return cb("DB api not present");
            //     }
                
            //     var openReq = window.indexedDB.open("kmptool", 15021401);
                
            //     openReq.onerror = function(evt) {
            //         cb("An error occurred opening the db");
            //     }
                
            //     openReq.onsuccess = function(evt) {
            //         db = openReq.result;
            //         cb();
            //     }
                
            //     openReq.onupgradeneeded = function(evt) {
            //         Logger.infoi("onupgradeneeded");
            //         db = evt.target.result;
                    
            //         db.onerror = function(evt) {
            //             Logger.errori("Error with db ", evt);
            //         }
                    
            //         //////////////////////////////////////////////////////////////////////
            //         // Scheme definition
            //         var parts = db.createObjectStore("parts");
                    
            //         parts.createIndex("id", "id", {unique: true});
            //         parts.createIndex("name", "name", {unique: true});
            //         parts.createIndex("type", "type", {unique: false});
            //         parts.createIndex("mod", "mod", {unique: false});
                    
            //         var projects = db.createObjectStore("projects");
                    
            //         projects.createIndex("id", "id", {unique: true});
            //         projects.createIndex("name", "name", {unique: false});
                    
            //     }
            // }
            
            // function getProjects(cb) {
                
            //     if (!db) return cb("no db");
                
            //     var t = db.transaction("projects", "readonly");
                
            //     t.oncomplete = function(evt) {
            //         Logger.infoi("Transaction complete");
            //     }
            //     t.onerror = function(evt) {
            //         Logger.errori("Transaction error ", evt);
            //     }
                
            //     var os = t.objectStore("projects");
                
            //     var osReq = os.openCursor();
            //     var accumulator = [];
            //     osReq.onsuccess = function(evt) {
            //         var cursor = evt.target.result;
            //         if (cursor) {
            //             accumulator.push(cursor.value);
            //             cursor.continue();
            //         } else {
            //             // No more data so we are done
                        
            //             // Sort them though to be nice
            //             accumulator.sort(function(a,b) {
            //                 if (a.name < b.name) return -1;
            //                 if (a.name > b.name) return 1;
            //                 return 0;
            //             });
                        
            //             return cb(null, accumulator);
            //         }
            //     }
            // }
            
            // function createProject(name, cb) {
            //     if (!db) return cb("no db");
                
            //     var t = db.transaction("projects", "readwrite");
                
            //     t.oncomplete = function(evt) {
            //         Logger.infoi("Transaction complete");
            //     }
            //     t.onerror = function(evt) {
            //         Logger.errori("Transaction error ", evt);
            //     }
                
            //     var os = t.objectStore("projects");
                
            //     var proj = {
            //         id: Date.now()
            //         , name: name
            //     }

            //     var osReq = os.add(proj);
            //     osReq.onsuccess = function(evt) {
            //         cb(null, proj);
            //         $rootScope.$emit("kmpProjectsChanged");
            //     }
            //     osReq.onerror = function(evt) {
            //         Logger.errori("Add error ", evt);
            //     }
            // }
            
            // function deleteProject(id, cb) {
            //     if (!db) return cb("no db");
                
            //     var t = db.transaction("projects", "readwrite");
                
            //     t.oncomplete = function(evt) {
            //         Logger.infoi("Transaction complete");
            //     }
            //     t.onerror = function(evt) {
            //         Logger.errori("Transaction error ", evt);
            //     }
                
            //     var os = t.objectStore("projects");
                
            //     var osReq = os.delete(id);
            //     osReq.onsuccess = function(evt) {
            //         cb(null);
            //         $rootScope.$emit("kmpProjectsChanged");
            //     }
            //     osReq.onerror = function(evt) {
            //         Logger.errori("Delete error ", evt);
            //     }
            // }
            

            // return {
            //     checkEnvironment: checkEnvironment
            //     , getProjects: getProjects
                
            //     , createProject: createProject
            // }
        }]
    )
        
