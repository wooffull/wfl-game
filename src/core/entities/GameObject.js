"use strict";

const PIXI            = require('pixi.js');
const geom            = require('../../geom');
const animation       = require('./animation');
const GameObjectState = animation.GameObjectState;
const FrameObject     = animation.FrameObject;

/**
 * Generic object for the game's canvas
 */
var GameObject = function () {
  PIXI.Container.call(this);
  
  this.position     = new geom.Vec2(this.position.x, this.position.y, this.position.cb, this.position.scope);
  this.vertices     = undefined;
  this.states       = {};
  this.currentState = undefined;
  this.layer        = undefined;
  this.customData   = {};
};

Object.defineProperties(GameObject, {
  STATE: {
    value: {
      DEFAULT: "DEFAULT"
    }
  },
  
  createState: {
    value: function (name, vertices) {
      return new GameObjectState(name, vertices);
    }
  },
  
  createFrame: {
    value: function (texture, duration, createBoundingBox) {
      return new FrameObject(texture, duration, createBoundingBox);
    }
  }
});

GameObject.prototype = Object.freeze(Object.create(PIXI.Container.prototype, {
  update: {
    value: function (dt) {
      if (this.currentState !== undefined) {
        this.currentState.update(dt);
        
        let sprite    = this.currentState.getSprite();
        this.vertices = this.currentState.getVertices();
        
        if (sprite) {
          // Reset Container's children
          this.children.length = 0;
          
          // Add the current frame's sprite and update container's transform
          this.addChild(sprite);
          this.updateTransform();
        } else {
          this.width  = 0;
          this.height = 0;
        }
      }
    }
  },

  drawDebug: {
    value: function (ctx) {
      if (this.vertices.length > 0) {
        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (var i = 1; i < this.vertices.length; i++) {
          ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  },

  getState: {
    value: function (stateName) {
      return this.states[stateName];
    }
  },

  setState: {
    value: function (stateName) {
      var newState = this.states[stateName];

      if (this.currentState !== newState) {
        this.currentState = newState;
        this.currentState.setFrame(0);
        
        let sprite    = this.currentState.getSprite();
        this.vertices = this.currentState.getVertices();
        this.width    = sprite.width;
        this.height   = sprite.height;
      }
    }
  },

  addState: {
    value: function (stateName, state) {
      // If only the state was passed in as the 1st parameter,
      // then get the state name from that state
      if (typeof state === 'undefined' && stateName) {
        state     = stateName;
        stateName = state.name;
      }
      
      this.states[stateName] = state;
      state.setName(stateName);

      // No current state yet, so initialize game object with newly
      // added state
      if (this.currentState === undefined) {
        this.setState(stateName);
      }
    }
  }
}));

Object.freeze(GameObject);

module.exports = GameObject;