// The way this works is that this file requires others which are collected
// into a single "kmptool.js" file. This file itself is not loaded by the
// browser. Thus, within the definition of those other modules they need
// to properly setup whatever the browser is expecting.

require("logger");

require("./app");
require("./controllers/start");
require("./controllers/project-list");
require("./controllers/top-bar");