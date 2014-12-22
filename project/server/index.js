var express = require("express");
var morgan = require("morgan");
var cors = require("cors");

var app = express();

app.use(morgan("combined"));
app.use(cors());

// No caching because this server is only suitable for debugging anyway
app.use(express.static("dist", {maxAge: 0 }));



if (process.env.PORT) {
    console.log("Environment port is ",process.env.PORT)
    app.set("port", process.env.PORT);
} else {
    console.log("No default port in environment")

    // Always 3000 because we always expect to be fronted by something like nginx etc.
    app.set("port", 3000);
}

if (process.env.IP) {
    console.log("Environment ip is ",process.env.IP);
    app.set("ip", process.env.IP);
} else {
    console.log("No default ip in environment. Using 127.0.0.1");
    app.set("ip", "127.0.0.1");
}


app.listen(app.get("port"), app.get("ip"), function () {
    console.log("Started kmptool web server on port ",app.get("port"));
});
