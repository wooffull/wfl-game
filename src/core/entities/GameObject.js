"use strict";

var animation = require('./animation');
var GameObjectState = animation.GameObjectState;
var FrameObject = animation.FrameObject;

/**
 * Generic object for the game's canvas
 */
var GameObject = function () {
    this.graphic = undefined;
    this.vertices = undefined;
    this.states = {};
    this.currentState = undefined;
    this.layer = undefined;
    this.customData = {};
    this.width = 0;
    this.height = 0;
};

Object.defineProperties(GameObject, {
    STATE : {
        value : {
            DEFAULT : "DEFAULT"
        }
    }
});

GameObject.prototype = Object.freeze(Object.create(GameObject.prototype, {
    update : {
        value : function (dt) {
            if (this.currentState !== undefined) {
                this.currentState.update(dt);
                this.graphic  = this.currentState.getGraphic();
                this.vertices = this.currentState.getVertices();
              
                if (this.graphic) {
                    this.width  = this.graphic.width;
                    this.height = this.graphic.height;
                } else {
                    this.width  = 0;
                    this.height = 0;
                }
            }
        }
    },

    draw : {
        value : function (ctx) {
            if (this.graphic !== undefined) {
                ctx.drawImage(this.graphic, -this.graphic.width * 0.5, -this.graphic.height * 0.5);
            }
        }
    },

    drawDebug : {
        value : function (ctx) {
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

    getState : {
        value : function (stateName) {
            return this.states[stateName];
        }
    },

    setState : {
        value : function (stateName) {
            var newState = this.states[stateName];

            if (this.currentState !== newState) {
                this.currentState = newState;
                this.currentState.setFrame(0);
              
                this.vertices = this.currentState.getVertices();
                this.graphic  = this.currentState.getGraphic();
                this.width    = this.graphic.width;
                this.height   = this.graphic.height;
            }
        }
    },

    addState : {
        value : function (stateName, state) {
            this.states[stateName] = state;
            state.setName(stateName);

            // No current state yet, so initialize game object with newly
            // added state
            if (this.currentState === undefined) {
                this.setState(stateName);

                this.vertices = this.currentState.getVertices();
                this.graphic  = this.currentState.getGraphic();
            }
        }
    },
    
    createState : {
        value : function () {
            return new GameObjectState();
        }
    },
    
    createFrame : {
        value : function (graphic, duration, createBoundingBox) {
            return new FrameObject(graphic, duration, createBoundingBox);
        }
    }
}));

Object.freeze(GameObject);

module.exports = GameObject;