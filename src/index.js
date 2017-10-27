"use strict";

// WFL Modules
const core          = require('./core');
const behavior      = require('./behavior');
const display       = require('./display');
const input         = require('./input');
const geom          = require('./geom');
const debug         = require('./debug');
const datastructure = require('./datastructure');
const world         = require('./world');

const create = function (canvas) {
  return new core.Game(canvas);
};

module.exports = {
  core:          core,
  behavior:      behavior,
  display:       display,
  input:         input,
  geom:          geom,
  debug:         debug,
  datastructure: datastructure,
  world:         world,

  // Consistent reference for jQuery
  jquery:        require('jquery'),
  
  // Consistent reference for PIXI
  PIXI:          require('pixi.js'),

  create:        create
};