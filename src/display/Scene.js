"use strict";

var debug = require('../debug');
var datastructure = require('../datastructure');
var geom = require('../geom');
var cameras = require('./cameras');
var backgrounds = require('./backgrounds');

var Scene = function (canvas) {
    this._gameObjectLayers = undefined;
    this._screenOffset     = new geom.Vec2(canvas.width * 0.5, canvas.height * 0.5);
    this._quadtree         = new datastructure.Quadtree(0, {
        x      : 0,
        y      : 0,
        width  : canvas.width,
        height : canvas.height
    });
  
    this._nearbyGameObjects = [];
    this._chunks            = [];
    this._chunkConfig       = {
        size : Scene.DEFAULT_CHUNK_SIZE,
        minX : Infinity,
        minY : Infinity,
        maxX : -Infinity,
        maxY : -Infinity
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
            var objOffset = new geom.Vec2(
                obj.position.x - this.camera.position.x,
                obj.position.y - this.camera.position.y
            );
            var width  = (Math.abs(Math.cos(obj.rotation)) * obj.width  + Math.abs(Math.sin(obj.rotation)) * obj.height);
            var height = (Math.abs(Math.cos(obj.rotation)) * obj.height + Math.abs(Math.sin(obj.rotation)) * obj.width);
            
            // If the game object is too far away, it currently cannot be seen
            return (objOffset.x + (width  >> 1) >= -this._screenOffset.x / this.camera.zoom &&
                    objOffset.x - (width  >> 1) <= this._screenOffset.x  / this.camera.zoom &&
                    objOffset.y + (height >> 1) >= -this._screenOffset.y / this.camera.zoom &&
                    objOffset.y - (height >> 1) <= this._screenOffset.y  / this.camera.zoom);
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
            for (var i = 0; i < this._nearbyGameObjects.length; i++) {
                this._quadtree.insert(this._nearbyGameObjects[i]);
            }

            for (var i = 0; i < this._nearbyGameObjects.length; i++) {
                this._nearbyGameObjects[i].update(dt);
            }

            this.camera.update(dt);
            this._handleCollisions(this._nearbyGameObjects);
        }
    },

    /**
     * Draws the scene and all game objects in it
     */
    draw : {
        value : function (ctx) {
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
        }
    },
  
    _beforeDraw : {
        value : function (ctx) {
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
        }
    },
  
    _afterDraw : {
        value : function (ctx) {
            ctx.restore();
        }
    },
  
    _partitionChunks : {
        value : function () {
            this._chunks = [];

            var gameObjects = this.getGameObjects();
            var minX = Infinity;
            var minY = Infinity;
            var maxY = -Infinity;
            var maxX = -Infinity;
            var totalChunksHorizontal = 0;
            var totalChunksVertical   = 0;

            // Find min and max positions
            for (var i = 0; i < gameObjects.length; i++) {
                var pos = gameObjects[i].position;

                minX = Math.min(pos.x, minX);
                minY = Math.min(pos.y, minY);
                maxX = Math.max(pos.x, maxX);
                maxY = Math.max(pos.y, maxY);
            }

            totalChunksHorizontal = Math.max(Math.ceil((maxX - minX) / this._chunkConfig.size), 1);
            totalChunksVertical   = Math.max(Math.ceil((maxY - minY) / this._chunkConfig.size), 1);

            for (var i = 0; i < totalChunksHorizontal; i++) {
                this._chunks[i] = [];

                for (var j = 0; j < totalChunksVertical; j++) {
                    this._chunks[i][j] = [];
                }
            }

            // Add game objects to the chunk they're located in
            for (var i = 0; i < gameObjects.length; i++) {
                var pos = gameObjects[i].position;
                var chunkX = Math.floor((totalChunksHorizontal - 1) * (pos.x - minX) / (maxX - minX));
                var chunkY = Math.floor((totalChunksVertical   - 1) * (pos.y - minY) / (maxY - minY));

                if (isNaN(chunkX)) chunkX = 0;
                if (isNaN(chunkY)) chunkY = 0;

                this._chunks[chunkX][chunkY].push(gameObjects[i]);
            }

            this._chunkConfig.minX = minX;
            this._chunkConfig.minY = minY;
            this._chunkConfig.maxX = maxX;
            this._chunkConfig.maxY = maxY;

            this._quadtree = new datastructure.Quadtree(0, {
                x      : minX,
                y      : minY,
                width  : maxX - minX,
                height : maxY - minY
            });
        }
    },
  
    _findSurroundingChunkIndices : {
        value : function (gameObject, chunkRadius) {
            if (typeof chunkRadius === "undefined") chunkRadius = 1;

            var totalChunksHorizontal = this._chunks.length;
            var totalChunksVertical   = this._chunks[0].length;
            var pos                   = gameObject.position;
            var chunkX                = Math.floor((totalChunksHorizontal - 1) * (pos.x - this._chunkConfig.minX) / (this._chunkConfig.maxX - this._chunkConfig.minX));
            var chunkY                = Math.floor((totalChunksVertical   - 1) * (pos.y - this._chunkConfig.minY) / (this._chunkConfig.maxY - this._chunkConfig.minY));

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
            var nearChunkIndices = this._findSurroundingChunkIndices(gameObject, chunkRadius);
            var nearChunks       = [];

            for (var i = 0; i < nearChunkIndices.length; i++) {
                var x = nearChunkIndices[i].x;
                var y = nearChunkIndices[i].y;
                nearChunks.push(this._chunks[x][y]);
            }

            return nearChunks;
        }
    },
  
    _findSurroundingGameObjects : {
        value : function (gameObject, chunkRadius) {
            var nearChunks  = this._findSurroundingChunks(gameObject, chunkRadius);
            var gameObjects = [];

            for (var i = 0; i < nearChunks.length; i++) {
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
            // Reset collision references
            for (var i = 0; i < gameObjects.length; i++) {
                var cur = gameObjects[i];
                cur.customData.collisionId   = i;
                cur.customData.collisionList = [];
            }

            for (var i = 0; i < gameObjects.length; i++) {
                var cur = gameObjects[i];

                // Skip over certain objects for collision detection because
                // other objects will check against them later
                if (!cur) {
                    continue;
                }

                var possibleCollisions = [];
                this._quadtree.retrieve(possibleCollisions, cur);

                for (var j = 0; j < possibleCollisions.length; j++) {
                    var obj0 = gameObjects[i];
                    var obj1 = possibleCollisions[j];

                    if (obj0 && obj1 && obj0 !== obj1) {
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