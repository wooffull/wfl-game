"use strict"

var $ = require('jquery');

var Keyboard = {
  /**
   *  Letters
   */
  A : 65,
  B : 66,
  C : 67,
  D : 68,
  E : 69,
  F : 70,
  G : 71,
  H : 72,
  I : 73,
  J : 74,
  K : 75,
  L : 76,
  M : 77,
  N : 78,
  O : 79,
  P : 80,
  Q : 81,
  R : 82,
  S : 83,
  T : 84,
  U : 85,
  V : 86,
  W : 87,
  X : 88,
  Y : 89,
  Z : 90,

  /**
   * Arrows
   */
  LEFT  : 37,
  UP    : 38,
  RIGHT : 39,
  DOWN  : 40,

  /**
   * Numbers
   */
  ZERO  : 48,
  ONE   : 49,
  TWO   : 50,
  THREE : 51,
  FOUR  : 52,
  FIVE  : 53,
  SIX   : 54,
  SEVEN : 55,
  EIGHT : 56,
  NINE  : 57,

  /**
   * Numpad and Related
   */
  ZERO_NUMPAD   : 96 ,
  ONE_NUMPAD    : 97 ,
  TWO_NUMPAD    : 98 ,
  THREE_NUMPAD  : 99 ,
  FOUR_NUMPAD   : 100,
  FIVE_NUMPAD   : 101,
  SIX_NUMPAD    : 102,
  SEVEN_NUMPAD  : 103,
  EIGHT_NUMPAD  : 104,
  NINE_NUMPAD   : 105,
  ASTERISK      : 106,
  PLUS_NUMPAD   : 107,
  MINUS_NUMPAD  : 109,
  PERIOD_NUMPAD : 110,
  SLASH_NUMPAD  : 111,
  NUM_LOCK      : 144,

  /**
   * Function Keys (F Keys)
   */
  F1  : 112,
  F2  : 113,
  F3  : 114,
  F4  : 115,
  F5  : 116,
  F6  : 117,
  F7  : 118,
  F8  : 119,
  F9  : 120,
  F10 : 121,
  F11 : 122,
  F12 : 123,

  /**
   * Miscellaneous
   */
  BACKSPACE            : 8  ,
  TAB                  : 9  ,
  ENTER                : 13 ,
  SHIFT                : 16 ,
  CONTROL              : 17 ,
  ALT                  : 18 ,
  PAUSE                : 19 ,
  CAPS_LOCK            : 20 ,
  ESCAPE               : 27 ,
  SPACEBAR             : 32 ,
  PAGE_UP              : 33 ,
  PAGE_DOWN            : 34 ,
  END                  : 35 ,
  HOME                 : 36 ,
  PRINT_SCREEN         : 44 ,
  INSERT               : 45 ,
  DELETE               : 46 ,
  WINDOWS              : 91 ,
  SCROLL_LOCK          : 145,
  SEMICOLON            : 186,
  EQUALS               : 187,
  COMMA                : 188,
  MINUS                : 189,
  PERIOD               : 190,
  SLASH                : 191,
  ACCENT               : 192,
  LEFT_SQUARE_BRACKET  : 219,
  BACKSLASH            : 220,
  RIGHT_SQUARE_BRACKET : 221,
  APOSTROPHE           : 222,
  
  keyStates: (function () {
    var _keyStates = [];

    for (var i = 0; i < 256; i++) {
      _keyStates[i] = false;
    }

    return _keyStates;
  })(),
  
  previousKeyStates: (function () {
    var _keyStates = [];

    for (var i = 0; i < 256; i++) {
      _keyStates[i] = false;
    }

    return _keyStates;
  })(),
  
  // Determines if key events will be registered
  isOn: true,
  // Whether or not a change has been made that requires an update
  needsToBeUpdated: false,
  // Whether or not any key is currently pressed
  anyKeyPressed: false
};

Object.defineProperties(Keyboard, {
    /**
     * Array that contains the name for each known key code
     */
    keyNames : {
         value : (function () {
            var keys = [];
            var letters = [
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                'u', 'v', 'w', 'x', 'y', 'z'
            ];

            keys[8] = "backspace";
            keys[9] = "tab";
            keys[13] = "enter";
            keys[16] = "shift";
            keys[17] = "ctrl";
            keys[18] = "alt";
            keys[20] = "capslock";
            keys[27] = "esc";
            keys[32] = "spacebar";
            keys[33] = "pgup";
            keys[34] = "pgdn";
            keys[35] = "end";
            keys[36] = "home";
            keys[37] = "left";
            keys[38] = "up";
            keys[39] = "right";
            keys[40] = "down";
            keys[45] = "insert";
            keys[46] = "delete";
            keys[91] = "windows";
            keys[106] = "*";
            keys[107] = "+";
            keys[109] = "-";
            keys[110] = "[numpad] .";
            keys[111] = "/";
            keys[144] = "numlock";
            keys[186] = ";";
            keys[187] = "=";
            keys[188] = ",";
            keys[189] = "-";
            keys[190] = ".";
            keys[191] = "/";
            keys[192] = "`";
            keys[219] = "[";
            keys[220] = "\\";
            keys[221] = "]";
            keys[222] = "'";

            for (var i = 48; i < 58; i++) {
                keys[i] = (i - 48).toString();
            }

            for (i = 65; i < 91; i++) {
                keys[i] = letters[i - 65];
            }

            for (i = 96; i < 106; i++) {
                keys[i] = "[numpad] " + (i - 96).toString();
            }

            for (i = 112; i < 124; i++) {
                keys[i] = "f" + (i - 111).toString();
            }

            for (i = 0; i < keys.length; i++) {
                if (!keys[i]) {
                    keys[i] = "[keyCode = " + i + "]";
                }
            }

            return keys;
        })()
    },
  
    /**
     * Returns the key that was just pressed
     */
    getKeyJustPressed : {
        value : function () {
            for (var i = 0; i < Keyboard.keyStates.length; i++) {
                if (Keyboard.justPressed(i)) {
                    return i;
                }
            }

            return -1;
        }
    },

    /**
     * Returns the key that was just released
     */
    getKeyJustReleased : {
        value : function () {
            for (var i = 0; i < Keyboard.keyStates.length; i++) {
                if (Keyboard.justReleased(i)) {
                    return i;
                }
            }

            return -1;
        }
    },

    /**
     * Clears all key states
     */
    clear : {
        value : function () {
            for (var i = 0; i < Keyboard.keyStates.length; i++) {
                Keyboard.keyStates[i] = false;
                Keyboard.previousKeyStates[i] = false;
            }

            Keyboard.needsToBeUpdated = false;
            Keyboard.anyKeyPressed = false;
        }
    },

    /**
     * Returns whether or not the given key is currently pressed
     */
    isPressed : {
        value : function (keyCode) {
            return Keyboard.keyStates[keyCode];
        }
    },

    /**
     * Returns whether or not the given key has just been pressed
     */
    justPressed : {
        value : function (keyCode) {
            return Keyboard.keyStates[keyCode] &&
                   Keyboard.previousKeyStates[keyCode] !=
                   Keyboard.keyStates[keyCode];
        }
    },

    /**
     * Returns whether or not the given key has just been released
     */
    justReleased : {
        value : function (keyCode) {
            return !Keyboard.keyStates[keyCode] &&
                   Keyboard.previousKeyStates[keyCode] !=
                   Keyboard.keyStates[keyCode];
        }
    },

    /**
     * To be called at the end of every frame
     */
    update : {
        value : function () {
            if (Keyboard.needsToBeUpdated) {
                var anyKeyPressed = false;

                for (var i = 0; i < Keyboard.keyStates.length; i++) {
                    Keyboard.previousKeyStates[i] = Keyboard.keyStates[i];

                    if (Keyboard.keyStates[i]) {
                        anyKeyPressed = true;
                    }
                }

                Keyboard.needsToBeUpdated = false;
                Keyboard.anyKeyPressed = anyKeyPressed;
            }
        }
    },

    /**
     * Stops registering key events
     */
    stop : {
        value : function () {
            Keyboard.isOn = false;
            Keyboard.clear();

            if (window) {
                $(window).off("keydown");
                $(window).off("keyup");
            }
        }
    },

    /**
     * Starts registering key events
     */
    start: {
        value : function () {
            Keyboard.isOn = true;

            if (window) {
                // Clear listeners first, just so we never have multiple
                $(window).off("keydown");
                $(window).off("keyup");

                $(window).on("keydown", Keyboard._onKeyDown.bind(Keyboard));
                $(window).on("keyup", Keyboard._onKeyUp.bind(Keyboard));
            }
        }
    },

    /**
     * Called when a key has been pressed
     */
    _onKeyDown : {
        value : function (e) {
            if (Keyboard.isOn && e.keyCode < Keyboard.keyStates.length) {
              if (!Keyboard.keyStates[e.keyCode]) {
                  Keyboard.keyStates[e.keyCode] = true;
                  Keyboard.needsToBeUpdated = true;
                  Keyboard.anyKeyPressed = true;

                  $(Keyboard).trigger('keydown');
              }
              
              $(Keyboard).trigger('keypressed');
            }
            if (e.keyCode >= Keyboard.keyStates.length) {
                console.log("EXTRA KEYCODE: " + e.keyCode);
            }

            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    },

    /**
     * Called when a key has been lifted
     */
    _onKeyUp : {
        value : function (e) {
            if (Keyboard.isOn && e.keyCode < Keyboard.keyStates.length &&
                Keyboard.keyStates[e.keyCode]) {

                Keyboard.keyStates[e.keyCode] = false;
                Keyboard.needsToBeUpdated = true;
          
                $(Keyboard).trigger('keyup');
            }
        }
    }
});

module.exports = Keyboard;