"use strict";

const Behavior = require('./Behavior.js');

/**
 * To be used by the editor
 */
const property = Object.defineProperties({}, {
  Type: {
    value: {
      BOOLEAN: 'boolean',
      STRING:  'string',
      INTEGER: 'integer',
      NUMBER:  'number',
      DYNAMIC: 'dynamic'
    }
  },
  
  // TODO: Clean up
  Boolean: {
    value: function (defaultValue = false) {
      var val = defaultValue;
      var indeterminate = false;
      
      if (typeof val !== 'boolean') {
        throw `TypeError: Expected boolean value but got ${val}`;
      }
      
      return {
        type: property.Type.BOOLEAN,
        clone: function () { return property.Boolean(this.value) },
        get indeterminate() { return indeterminate; },
        set indeterminate(x) { indeterminate = x; },
        get value()  { return indeterminate ? null : val; },
        set value(x) {
          if (typeof x !== 'boolean') {
            throw `TypeError: Expected boolean value but got ${x}`;
          }
          
          val = x;
          indeterminate = false;
        }
      };
    }
  },
  
  // TODO: Clean up
  String: {
    value: function (defaultValue = '') {
      var val = defaultValue;
      var indeterminate = false;
      
      if (typeof val !== 'string' && !(val instanceof String)) {
        throw `TypeError: Expected string value but got ${val}`;
      }
      
      return {
        type:  property.Type.STRING,
        clone: function () { return property.String(this.value) },
        get indeterminate() { return indeterminate; },
        set indeterminate(x) { indeterminate = x; },
        get value()  { return indeterminate ? null : val; },
        set value(x) {
          if (typeof x !== 'string' && !(x instanceof String)) {
            throw `TypeError: Expected string value but got ${x}`;
          }
          
          val = x;
          indeterminate = false;
        }
      };
    }
  },
  
  // TODO: Clean up
  Integer: {
    value: function (defaultValue = 0, min = -Infinity, max = Infinity) {
      var val = parseInt(defaultValue);
      var indeterminate = false;

      if (isNaN(val)) {
        throw 'TypeError: Expected integer-compatible value';
      }
      
      // Basic Integer
      if (min === -Infinity && max === Infinity) {
        return {
          type: property.Type.INTEGER,
          clone: function () {
            return property.Integer(this.value, min, max)
          },
          get indeterminate() { return indeterminate; },
          set indeterminate(x) { indeterminate = x; },
          get value()  { return indeterminate ? null : val; },
          set value(x) {
            let intX = parseInt(x);

            if (isNaN(intX)) {
              throw 'TypeError: Expected integer-compatible value';
            }

            val = intX;
            indeterminate = false;
          }
        };
      }
      
      if (!isNaN(min) && min !== -Infinity) {
        min = parseInt(min);
      }
      if (!isNaN(max) && max !== Infinity) {
        max = parseInt(max);
      }

      if (isNaN(min) || isNaN(max)) {
        throw 'TypeError: Expected integer-compatible min and max';
      }
      
      if (max <= min) {
        throw 'RangeError: Expected max to be greater than min';
      }
      
      val = Math.min(
        Math.max(val, min),
        max
      );
      
      // Ranged Integer
      return {
        type: property.Type.INTEGER,
        clone: function () { return property.Integer(this.value, min, max) },
        get indeterminate() { return indeterminate; },
        set indeterminate(x) { indeterminate = x; },
        get value()  { return indeterminate ? null : val; },
        set value(x) {
          let intX = parseInt(x);
          
          if (isNaN(intX)) {
            throw 'TypeError: Expected integer-compatible value';
          }
          
          val = Math.min(
            Math.max(intX, min),
            max
          );
          indeterminate = false;
        }
      };
    }
  },
  
  // TODO: Clean up
  Number: {
    value: function (defaultValue = 0, min = -Infinity, max = Infinity) {
      var val = parseFloat(defaultValue);
      var indeterminate = false;

      if (isNaN(val)) {
        throw 'TypeError: Expected number-compatible value';
      }
      
      // Basic Number
      if (min === -Infinity && max === Infinity) {
        return {
          type: property.Type.NUMBER,
          clone: function () { return property.Number(this.value, min, max) },
          get indeterminate() { return indeterminate; },
          set indeterminate(x) { indeterminate = x; },
          get value()  { return indeterminate ? null : val; },
          set value(x) {
            let numberX = parseFloat(x);

            if (isNaN(numberX)) {
              throw 'TypeError: Expected number-compatible value';
            }

            val = numberX;
            indeterminate = false;
          }
        };
      }
      
      if (!isNaN(min) && min !== -Infinity) {
        min = parseFloat(min);
      }
      if (!isNaN(max) && max !== Infinity) {
        max = parseFloat(max);
      }
      
      if (isNaN(min) || isNaN(max)) {
        throw 'TypeError: Expected number-compatible min and max';
      }
      
      if (max <= min) {
        throw 'RangeError: Expected max to be greater than min';
      }
      
      val = Math.min(
        Math.max(val, min),
        max
      );
      
      // Ranged Number
      return {
        type: property.Type.NUMBER,
        clone: function () { return property.Number(this.value, min, max) },
        get indeterminate() { return indeterminate; },
        set indeterminate(x) { indeterminate = x; },
        get value()  { return indeterminate ? null : val; },
        set value(x) {
          let numberX = parseFloat(x);
          
          if (isNaN(numberX)) {
            throw 'TypeError: Expected number-compatible value';
          }
          
          val = Math.min(
            Math.max(numberX, min),
            max
          );
          indeterminate = false;
        }
      };
    }
  },
  
  // TODO: Clean up
  Dynamic: {
    value: function (defaultValue = undefined) {
      var val = defaultValue;
      var indeterminate = false;
      
      return {
        type:  property.Type.DYNAMIC,
        clone: function () { return property.Dynamic(this.value) },
        get indeterminate() { return indeterminate; },
        set indeterminate(x) { indeterminate = x; },
        get value()  { return indeterminate ? null : val; },
        set value(x) { indeterminate = false; val = x; }
      };
    }
  }
});

module.exports = {
  Behavior: Behavior,
  property: property
};