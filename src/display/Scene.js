"use strict";

const PIXI          = require('pixi.js');

const debug         = require('../debug');
const datastructure = require('../datastructure');
const geom          = require('../geom');
const cameras       = require('./cameras');
const backgrounds   = require('./backgrounds');

var Scene = function (canvas) {
  this._stage = new PIXI.Container();
  
  this._gameObjectLayers = undefined;
  this._screenOffset     = new geom.Vec2(canvas.width * 0.5, canvas.height * 0.5);
  this._quadtree         = new datastructure.Quadtree(0, {
    x:      0,
    y:      0,
    width:  canvas.width,
    height: canvas.height
  });
  
  this._nearbyGameObjects = [];
  this._chunks            = [];
  this._chunkConfig       = {
    size: Scene.DEFAULT_CHUNK_SIZE,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  };

  this.camera   = new cameras.Camera();
  this.bg       = new backgrounds.StaticBackground();
  this.keyboard = undefined;
  this.player   = undefined;

  this.reset();
};

Object.defineProperties(Scene, {
  DEFAULT_CHUNK_SIZE : {
    value : 128 * 15
  }
}),

Scene.prototype = Object.freeze(Object.create(Scene.prototype, {
  /**
   * Clears up references used in the scene
   */
  destroy : {
    value : function () { }
  },

  /**
   * Resets the scene
   */
  reset : {
    value : function () {
      this._gameObjectLayers = { 0 : [] };
    }
  },

  /**
   * Gets all game objects in the scene
   */
  getGameObjects : {
    value : function () {
      var gameObjects = [];
      var layers = Object.keys(this._gameObjectLayers);

      for (var i = 0; i < layers.length; i++) {
        gameObjects = gameObjects.concat(this._gameObjectLayers[layers[i]]);
      }

      return gameObjects;
    }
  },

  /**
   * Adds a game object to the scene
   */
  addGameObject : {
    value : function (obj, layerId) {
      // If no layerId, push to the top of the bottom layer
      if (typeof layerId === "undefined") {
        layerId = 0;
      }

      var layer = this._gameObjectLayers[layerId];

      if (!layer) {
        this._gameObjectLayers[layerId] = [];
        layer = this._gameObjectLayers[layerId];
      }

      layer.push(obj);
      obj.layer = layerId;
      
      this._stage.addChild(obj);
      
      // Cache game object's calculations before update is called.
      // The cache calculations are needed in the quad tree (which is
      // updated in update())
      obj.cacheCalculations();
    }
  },

  /**
   * Removes a game object from the scene
   */
  removeGameObject : {
    value : function (obj, layerId) {
      // If no layerId provided, try to get the layer from the
      // gameObject itself
      if (typeof layerId === "undefined") {
        layerId = obj.layer;
      }

      // If still no layerId, check through all layers...
      if (typeof layerId === "undefined") {
        for (var i = 0; i < this._gameObjectLayers.length; i++) {
          var layer = this._gameObjectLayers[i];

          if (layer) {
            var objIndex = layer.indexOf(obj);

            if (objIndex >= 0 && objIndex < layer.length) {
              layer.splice(objIndex, 1);
              obj.layer = undefined;
            }
          }
        }
      } else {
        var layer = this._gameObjectLayers[layerId];

        if (layer) {
          var objIndex = layer.indexOf(obj);

          if (objIndex >= 0 && objIndex < layer.length) {
            layer.splice(objIndex, 1);
            obj.layer = undefined;
          }
        }
      }
    }
  },
  
  canSee : {
    value : function (obj) {
      var cache     =  obj.calculationCache;
      var width     = cache.aabbWidth;
      var height    = cache.aabbHeight;
      var objOffset = new geom.Vec2(
        cache.x - this.camera.position.x,
        cache.y - this.camera.position.y
      );
      
      // If the game object is too far away, it currently cannot be seen
      return (objOffset.x + (width  >> 1) >= -this._screenOffset.x / this.camera.zoom &&
              objOffset.x - (width  >> 1) <=  this._screenOffset.x / this.camera.zoom &&
              objOffset.y + (height >> 1) >= -this._screenOffset.y / this.camera.zoom &&
              objOffset.y - (height >> 1) <=  this._screenOffset.y / this.camera.zoom);
    }
  },

  /**
   * Updates the scene and all game objects in it
   */
  update : {
    value : function (dt) {
      // (Optimization) Partition all the game objects into chunks
      this._partitionChunks();
      this._nearbyGameObjects = this._findSurroundingGameObjects(this.camera);
      var nearbyObjectLength  = this._nearbyGameObjects.length;
      
      for (var i = 0; i < nearbyObjectLength; i++) {
        this._quadtree.insert(this._nearbyGameObjects[i]);
      }

      for (var i = 0; i < nearbyObjectLength; i++) {
        this._nearbyGameObjects[i].update(dt);
        this._nearbyGameObjects[i].cacheCalculations();
      }

      this.camera.update(dt);
      this._handleCollisions(this._nearbyGameObjects);
    }
  },

  /**
   * Draws the scene and all game objects in it
   */
  draw : {
    value : function (renderer) {
      //renderer.render(this._stage);
      /*
      var gameObjects = this.getGameObjects();

      for (var i = 0; i < gameObjects.length; i++) {
        var obj = gameObjects[i];
        
        // If the game object is too far away, don't draw it!
        if (this.canSee(obj)) {
          ctx.save();
          ctx.translate(obj.position.x, obj.position.y);
          obj.draw(ctx);
          debug() && obj.drawDebug(ctx);
          ctx.restore();
        }
      }

      if (debug()) {
        ctx.save();
        this._quadtree.draw(ctx);
        ctx.restore();
      }
    }*/
    }
  },
  
  _beforeDraw : {
    value : function (renderer) {
      this._stage.scale.set(1);
      this._stage.x = renderer.width  * 0.5;
      this._stage.y = renderer.height * 0.5;
      this._stage.scale.set(this.camera.zoom);
      this._stage.x -= this.camera.position.x;
      this._stage.y -= this.camera.position.y;
      
      /*
      ctx.save();
      
      // Update the screen offset
      this._screenOffset = new geom.Vec2(
        ctx.canvas.width  * 0.5,
        ctx.canvas.height * 0.5
      );

      this.bg.draw(ctx, this.camera);

      // Move the screen to the camera's position, then center that
      // position in the middle of the screen
      ctx.translate(this._screenOffset.x, this._screenOffset.y);
      ctx.scale(this.camera.zoom, this.camera.zoom);
      ctx.translate(-this.camera.position.x, -this.camera.position.y);
      */
    }
  },
  
  _afterDraw : {
    value : function (renderer) {
      //ctx.restore();
    }
  },
  
  _partitionChunks : {
    value : function () {
      this._chunks = [];

      var minX                  =  Infinity;
      var minY                  =  Infinity;
      var maxY                  = -Infinity;
      var maxX                  = -Infinity;
      var totalChunksHorizontal = 0;
      var totalChunksVertical   = 0;
      var gameObjects           = this.getGameObjects();
      var gameObjectLength      = gameObjects.length;

      // Find min and max positions
      for (var i = 0; i < gameObjectLength; i++) {
        var cache = gameObjects[i].calculationCache;

        minX = Math.min(cache.x, minX);
        minY = Math.min(cache.y, minY);
        maxX = Math.max(cache.x, maxX);
        maxY = Math.max(cache.y, maxY);
      }
      
      // Optimization: Calculate dx and dy ahead of time so they don't need to be calculated in
      // every iteration of an upcoming loop
      var dx = maxX - minX;
      var dy = maxY - minY;

      totalChunksHorizontal = Math.max(Math.ceil(dx / this._chunkConfig.size), 1);
      totalChunksVertical   = Math.max(Math.ceil(dy / this._chunkConfig.size), 1);

      for (var i = 0; i < totalChunksHorizontal; i++) {
        this._chunks[i] = [];

        for (var j = 0; j < totalChunksVertical; j++) {
          this._chunks[i][j] = [];
        }
      }

      // Add game objects to the chunk they're located in
      var chunkRatioX = (totalChunksHorizontal - 1) / dx;
      var chunkRatioY = (totalChunksVertical   - 1) / dy;
      for (var i = 0; i < gameObjectLength; i++) {
        var cache  = gameObjects[i].calculationCache;
        var chunkX = Math.floor(chunkRatioX * (cache.x - minX));
        var chunkY = Math.floor(chunkRatioY * (cache.y - minY));

        if (isNaN(chunkX)) chunkX = 0;
        if (isNaN(chunkY)) chunkY = 0;

        this._chunks[chunkX][chunkY].push(gameObjects[i]);
      }

      // Finally set values for chunk size and create a new quad tree
      this._chunkConfig.minX = minX;
      this._chunkConfig.minY = minY;
      this._chunkConfig.maxX = maxX;
      this._chunkConfig.maxY = maxY;
      this._quadtree = new datastructure.Quadtree(0, {
        x:      minX,
        y:      minY,
        width:  dx,
        height: dy
      });
    }
  },
  
  _findSurroundingChunkIndices : {
    value : function (gameObject, chunkRadius) {
      if (typeof chunkRadius === "undefined") chunkRadius = 1;

      var totalChunksHorizontal = this._chunks.length;
      var totalChunksVertical   = this._chunks[0].length;
      
      // The "||" is needed for the camera, which is not actually a GameObject.
      // TODO: Make camera a GameObject?
      var cache         = gameObject.calculationCache || gameObject.position;
      var chunkX        = Math.floor((totalChunksHorizontal - 1) * (cache.x - this._chunkConfig.minX) / (this._chunkConfig.maxX - this._chunkConfig.minX));
      var chunkY        = Math.floor((totalChunksVertical   - 1) * (cache.y - this._chunkConfig.minY) / (this._chunkConfig.maxY - this._chunkConfig.minY));

      if (isNaN(chunkX)) chunkX = 0;
      if (isNaN(chunkY)) chunkY = 0;

      var nearChunksIndices = [];

      for (var i = -chunkRadius; i <= chunkRadius; i++) {
        var refChunkX = chunkX + i;

        for (var j = -chunkRadius; j <= chunkRadius; j++) {
          var refChunkY = chunkY + j;

          if (refChunkX >= 0 && refChunkY >= 0 && refChunkX < totalChunksHorizontal && refChunkY < totalChunksVertical) {
            nearChunksIndices.push({x: refChunkX, y: refChunkY});
          }
        }
      }

      return nearChunksIndices;
    }
  },
  
  _findSurroundingChunks : {
    value : function (gameObject, chunkRadius) {
      var nearChunkIndices     = this._findSurroundingChunkIndices(gameObject, chunkRadius);
      var nearChunkIndexLength = nearChunkIndices.length;
      var nearChunks           = [];

      for (var i = 0; i < nearChunkIndexLength; i++) {
        var x = nearChunkIndices[i].x;
        var y = nearChunkIndices[i].y;
        nearChunks.push(this._chunks[x][y]);
      }

      return nearChunks;
    }
  },
  
  _findSurroundingGameObjects : {
    value : function (gameObject, chunkRadius) {
      var nearChunks      = this._findSurroundingChunks(gameObject, chunkRadius);
      var nearChunkLength = nearChunks.length;
      var gameObjects     = [];

      for (var i = 0; i < nearChunkLength; i++) {
        gameObjects = gameObjects.concat(nearChunks[i]);
      }

      return gameObjects;
    }
  },

  /**
   * Handles collisions between game objects
   */
  _handleCollisions : {
    value : function (gameObjects) {
      var gameObjectLength = gameObjects.length;
      
      // Reset collision references
      for (var i = 0; i < gameObjectLength; i++) {
        var cur = gameObjects[i];
        cur.customData.collisionId   = i;
        cur.customData.collisionList = [];
      }

      for (var i = 0; i < gameObjectLength; i++) {
        var obj0 = gameObjects[i];

        // Skip over certain objects for collision detection because
        // other objects will check against them later
        if (!obj0) {
          continue;
        }

        var possibleCollisions = [];
        this._quadtree.retrieve(possibleCollisions, obj0);
        var possibleCollisionLength = possibleCollisions.length;

        for (var j = 0; j < possibleCollisionLength; j++) {
          var obj1 = possibleCollisions[j];

          if (obj1 && obj0 !== obj1) {
            if (obj0.customData.collisionList.indexOf(obj1.customData.collisionId) === -1) {
              var collisionData = obj0.checkCollision(obj1);

              if (collisionData.colliding) {
                obj0.resolveCollision(obj1, collisionData);
                obj0.customData.collisionList.push(obj1.customData.collisionId);

                // Switch direction of collision for other object
                collisionData.direction.multiply(-1);

                obj1.resolveCollision(obj0, collisionData);
                obj1.customData.collisionList.push(obj0.customData.collisionId);
              }
            }
          }
        }
      }
    }
  }
}));

module.exports = Scene;