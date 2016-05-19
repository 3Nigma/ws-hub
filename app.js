#! /usr/bin/nodejs
const rrsol_node_ports = require('../rrsol_node_ports.js');
const pjson = require('./package.json');
const app_conf = rrsol_node_ports[pjson.name];
const EXPRESS_PORT = app_conf.express_port;
const WS_SERVER_PORT = app_conf.ws_port;

const ws = require("nodejs-websocket");
const express = require("express");
const bodyParser = require('body-parser');

var app = express();

var connPool = [];
var connId = 1;
var ws_server = ws.createServer(function (conn) {
  console.log("New connection established.");
  conn.on("text", function (str) {
    var jData = JSON.parse(str);

    if (typeof jData.id !== 'undefined') {
      conn.id = connId++;
      if (typeof connPool[jData.id] === 'undefined') {
        connPool[jData.id] = [];
      }
      connPool[jData.id].push(conn);

      console.log('Connection id ' + conn.id + ' got assigned to key ' + jData.id);
    }
  });
  conn.on("close", function (code, reason) {
    for (var connKey in connPool) {
      if (connPool.hasOwnProperty(connKey)) {
        for (var cId = 0; cId < connPool[connKey].length; cId++) {
          if (connPool[connKey][cId].id == this.id) {
            connPool[connKey].splice(cId, 1);

            console.log('Closed connection id ' + this.id + ' from key ' + connKey);
          }
        }
      }
    }
  });
}).listen(WS_SERVER_PORT);

app.use(bodyParser.json());
app.post('/', function (req, res) {
  var jData = req.body;

  if (jData === undefined || jData.to === undefined || jData.data === undefined) {
    res.status(403).send();
  }

  for (var connKey in connPool) {
    if (connPool.hasOwnProperty(connKey) && connKey == jData.to) {
      for (var cId = 0; cId < connPool[connKey].length; cId++) {
        connPool[connKey][cId].send(JSON.stringify(jData.data));
      }      
    }
  }
  res.send();
});

app.listen(EXPRESS_PORT, function () {
  console.log('WS-Hub news feeder listening on port ' + EXPRESS_PORT);
});
