"use strict";

const PIXI = require('pixi.js');

const Flag = {
  AABB:     'aabb',
  QUADTREE: 'quadtree',
  VERTICES: 'vertices',
  VECTORS:  'vectors'
};

const DEFAULT_DEBUG_OPTIONS = {
  aabb:     false,
  quadtree: false,
  vertices: true,
  vectors:  true
};

var debugOptions    = {};
var debugContainers = {};
var currentId       = -1;

var start = function (id, options = DEFAULT_DEBUG_OPTIONS) {
  if (!contains(id)) {
    debugOptions[id]    = options;
    debugContainers[id] = new PIXI.Graphics();
  }
};

var stop = function (id) {
  if (contains(id)) {
    delete debugOptions[id];
    delete debugContainers[id];
  }
  
  if (currentId === id) {
    currentId = -1;
  }
};

var contains = function (id) {
  return typeof debugOptions[id] !== 'undefined';
};

var setCurrentId = function (id) {
  currentId = id;
};

var clear = function (id = currentId) {
  if (contains(id)) {
    debugContainers[id].clear();
  }
};

var getContainer = function (id = currentId) {
  return debugContainers[id];
};

var getOptions = function (id = currentId) {
  if (contains(id)) {
    return debugOptions[id];
  }
  
  return null;
};

// If referenceGameObject is defined, its position is treated
// as the segment's origin. Otherwise, the segment's origin
// is (0, 0) in the world
var drawSegment = function (v1, v2, referenceGameObject) {
  var options = getOptions();
  
  if (options[Flag.VECTORS]) {
    var container = getContainer();
    var offset    = {x: 0, y: 0};

    if (referenceGameObject) {
      offset.x = referenceGameObject.x || 0;
      offset.y = referenceGameObject.y || 0;
    }

    if (container) {
      container.lineStyle(1, 0xFFFFFF, 1);
      container.moveTo(
        v1.x + offset.x,
        v1.y + offset.y
      );

      container.lineTo(
        v2.x + offset.x,
        v2.y + offset.y
      );
    }
  }
};

var drawPoint = function (point, radius = 3) {
  var options = getOptions();
  
  if (options[Flag.VECTORS]) {
    var container = getContainer();
    
    if (container) {
      container.lineStyle(0, 0xFFFFFF, 1);
      container.beginFill(0xFFFFFF);
      container.drawCircle(
        point.x,
        point.y,
        radius
      );
      container.endFill();
    }
  }
};

module.exports = {
  Flag:         Flag,
  
  start:        start,
  stop:         stop,
  contains:     contains,
  setCurrentId: setCurrentId,
  clear:        clear,
  getContainer: getContainer,
  getOptions:   getOptions,
  
  drawSegment:  drawSegment,
  drawPoint:    drawPoint
};