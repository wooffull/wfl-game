"use strict";

const PIXI            = require('pixi.js');
const geom            = require('../../geom');
const animation       = require('./animation');
const GameObjectState = animation.GameObjectState;
const FrameObject     = animation.FrameObject;
const debug           = require('../../debug');

// An ID counter used for GameObject's unique IDs. Increments every time a
// GameObject is created
var idCounter = 0;

/**
 * Generic object for the game's canvas
 */
var GameObject = function () {
  PIXI.Container.call(this);
  
  // Optimization: Use transform.position to avoid the getter for position
  this.transform.position = new geom.Vec2(this.position.x, this.position.y);
  
  this.transform.rotation = 0; // Updated per frame according to this.forward
  
  this.wflId              = idCounter++;
  this.name               = undefined;
  this.vertices           = [];
  this.states             = {};
  this.currentState       = undefined;
  this.layer              = undefined;
  this.customData         = {};
  this.calculationCache   = {};
  this.forward            = new geom.Vec2(1, 0);
  this.overlaps           = [];
  this.collisions         = [];
  
  // If false, the collision vertices in this game object's frame objects
  // will not rotate with the forward
  this.allowVertexRotation = true;
  
  // A reference to the previously added sprite so that it can be removed when
  // a new sprite is set with _setSprite()
  this._prevSprite        = undefined;
  
  // List of WFL behaviors to be performed every update()
  this._behaviors = [];
  this._newlyAddedBehaviors = []; // Cleared every frame
  
  this._bucketPosition = {x: 0, y: 0};
  this._cachedWidth    = 0;
  this._cachedHeight   = 0;
};

Object.defineProperties(GameObject, {
  STATE: {
    value: {
      DEFAULT: "DEFAULT"
    }
  },
  
  createState: {
    value: function (name) {
      return new GameObjectState(name);
    }
  },
  
  createFrame: {
    value: function (texture, duration, vertices) {
      return new FrameObject(texture, duration, vertices);
    }
  }
});

GameObject.prototype = Object.freeze(Object.create(PIXI.Container.prototype, {
  addBehavior: {
    value: function (behavior) {
      let index = this._behaviors.indexOf(behavior);
      
      if (index < 0) {
        behavior.gameObject = this;
        this._behaviors.push(behavior);
        this._newlyAddedBehaviors.push(behavior);
        behavior.initialize();
      }
    }
  },
  
  removeBehavior: {
    value: function (behavior) {
      let index = this._behaviors.indexOf(behavior);
      
      if (index >= 0) {
        this._behaviors.splice(index, 1);
        behavior.end();
        behavior.gameObject = null;
      }
    }
  },
  
  beginNewBehaviors: {
    value: function () {
      if (this._newlyAddedBehaviors.length > 0) {
        for (let behavior of this._newlyAddedBehaviors) {
          behavior.begin();
        }

        this._newlyAddedBehaviors = [];
      }
    }
  },
  
  update: {
    value: function (dt) {
      // The contents of this function should be copypasted into
      // PhysicsObject's cacheCalculations (for optimization)
      if (this.currentState !== undefined) {
        this.currentState.update(dt);
        this._setSprite(this.currentState.sprite);
      }
      
      this.transform.rotation = Math.atan2(this.forward._y, this.forward._x);
    }
  },
  
  /**
   * Called every frame before update() is called on any other GameObject
   */
  preUpdateBehaviors: {
    value: function (dt) {
      for (let behavior of this._behaviors) {
        behavior.preUpdate(dt);
      }
    }
  },
  
  updateBehaviors: {
    value: function (dt) {
      for (let behavior of this._behaviors) {
        behavior.update(dt);
      }
    }
  },
  
  /**
   * Called every frame after update() is called on all other GameObjects
   */
  postUpdateBehaviors: {
    value: function (dt) {
      for (let behavior of this._behaviors) {
        behavior.postUpdate(dt);
      }
    }
  },
  
  cleanBehaviorData: {
    value: function () {
      this.overlaps.length   = 0;
      this.collisions.length = 0;
    }
  },
  
  drawDebugQuadtree: {
    value: function (container = debug.getContainer()) {}
  },
  
  drawDebugVertices: {
    value: function (container = debug.getContainer()) {
      if (this.vertices.length > 0) {
        container.lineStyle(2, 0xBBBBFF, 1);
        container.moveTo(
          this.vertices[0].x + this.calculationCache.x,
          this.vertices[0].y + this.calculationCache.y
        );
        
        for (var i = 1; i < this.vertices.length; i++) {
          container.lineTo(
            this.vertices[i].x + this.calculationCache.x,
            this.vertices[i].y + this.calculationCache.y
          );
        }
        
        if (this.vertices.length > 2) {
          container.lineTo(
            this.vertices[0].x + this.calculationCache.x,
            this.vertices[0].y + this.calculationCache.y
          );
        }
      }
    }
  },

  drawDebugAABB: {
    value: function (container = debug.getContainer()) {
      container.lineStyle(1, 0xFFBBBB, 1);
      container.drawRect(
        this.calculationCache.x - this.calculationCache.aabbHalfWidth,
        this.calculationCache.y - this.calculationCache.aabbHalfHeight,
        this.calculationCache.aabbWidth,
        this.calculationCache.aabbHeight
      );
    }
  },

  rotate: {
    value: function (theta) {
      this.forward.rotate(theta);
      this.transform.rotation = this.forward.getAngle();

      if (this.allowVertexRotation) {
        for (var stateName in this.states) {
          var state = this.states[stateName];

          for (var i = 0; i < state.frameObjects.length; i++) {
            var frameObject = state.frameObjects[i];

            for (var j = 0; j < frameObject.vertices.length; j++) {
              frameObject.vertices[j].rotate(theta);
            }
          }
        }
      }

      return this;
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
        this.currentState.setCurrentFrame(0);
        
        // Call GameObject's prototype to update and set the new sprite
        GameObject.prototype.update.call(this, 0);
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
      state.name = stateName;

      // No current state yet, so initialize game object with newly
      // added state
      if (this.currentState === undefined) {
        this.setState(stateName);
      }
    }
  },
  
  checkBroadPhaseCollision: {
    value: function (physObj) {
      var cache      = this.calculationCache;
      var otherCache = physObj.calculationCache;

      // Specifically, check if the two object's AABBs are overlapping
      var thisHalfW = cache.aabbHalfWidth;
      var thisHalfH = cache.aabbHalfHeight;
      var thisX     = cache.x;
      var thisY     = cache.y;
      var thatHalfW = otherCache.aabbHalfWidth;
      var thatHalfH = otherCache.aabbHalfHeight;
      var thatX     = otherCache.x;
      var thatY     = otherCache.y;
      
      return thisX - thisHalfW <= thatX + thatHalfW &&
             thisX + thisHalfW >= thatX - thatHalfW &&
             thisY - thisHalfH <= thatY + thatHalfH &&
             thisY + thisHalfH >= thatY - thatHalfH;
    }
  },
  
  cacheCalculations: {
    value: function () {
      // The contents of this function should be copypasted into
      // PhysicsObject's cacheCalculations (for optimization)
      var position = this.transform.position;
      var width    = this._cachedWidth;
      var height   = this._cachedHeight;
      var rotation = this.transform.rotation;

      // Optimization for calculating aabb width and height
      var absCosRotation = Math.abs(Math.cos(rotation));
      var absSinRotation = Math.abs(Math.sin(rotation));
      
      this.calculationCache.x          = position._x;
      this.calculationCache.y          = position._y;
      this.calculationCache.width      = width;
      this.calculationCache.height     = height;
      this.calculationCache.rotation   = rotation;
      this.calculationCache.aabbWidth  =
          absCosRotation * width +
          absSinRotation * height;
      this.calculationCache.aabbHeight =
          absCosRotation * height +
          absSinRotation * width;
      this.calculationCache.aabbHalfWidth =
        this.calculationCache.aabbWidth * 0.5;
      this.calculationCache.aabbHalfHeight =
        this.calculationCache.aabbHeight * 0.5;
    }
  },
  
  _setSprite: {
    value: function (sprite) {
      // Don't do anything if this sprite is already added
      if (this._prevSprite === sprite) {
        return;
      }
      
      // Remove the previous sprite if it exists
      if (this._prevSprite) {
        this.removeChild(this._prevSprite);
      }
      
      this.vertices = this.currentState.vertices;

      if (sprite) {
        this.addChild(sprite);
        this._prevSprite = sprite;
        this._cachedWidth  = sprite.width;
        this._cachedHeight = sprite.height;
      } else {
        this.width  = 0;
        this.height = 0;
        this._cachedWidth  = 0;
        this._cachedHeight = 0;
      }
    }
  }
}));

module.exports = GameObject;