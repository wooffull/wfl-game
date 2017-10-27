"use strict";

const Constants = require('../Constants');

var worldScenes = {};

var registerScene = function (name, scene) {
  let gameId = Constants.currentId;
  if (typeof worldScenes[gameId] === 'undefined') {
    worldScenes[gameId] = {};
  }
  
  let gameScenes = worldScenes[gameId];
  gameScenes[name] = scene;
};

var unregisterScene = function (name) {
  let gameId = Constants.currentId;
  if (typeof worldScenes[gameId] !== 'undefined') {
    let gameScenes = worldScenes[gameId];
    gameScenes[name] = null;
    delete gameScenes[name];
  }
};

var findScene = function (name) {
  let gameId = Constants.currentId;
  if (typeof worldScenes[gameId] !== 'undefined') {
    let gameScenes = worldScenes[gameId];
    return gameScenes[name];
  }
  
  return null;
};

module.exports = {
  registerScene: registerScene,
  unregisterScene: unregisterScene,
  findScene: findScene
};