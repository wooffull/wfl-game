"use strict";

class Behavior {
  constructor() {
    this.gameObject = null;
  }
  
  initialize()   { }
  begin()        { }
  end()          { }
  preUpdate(dt)  { }
  update(dt)     { }
  postUpdate(dt) { }
  
  onOverlap(physObj)                { }
  onCollide(physObj, collisionData) { }
}

module.exports = Behavior;