// standard constants
const NaN       = +'NaN';
const Infinity  = 1 / 0;
const undefined = void 0;

// standard functions
import { decodeURI,
         decodeURIComponent,
         encodeURI,
         encodeURIComponent,
         eval,
         isFinite,
         isNaN,
         parseFloat,
         parseInt } from '@globals';


import { clearInterval,
         clearTimeout,
         setInterval,
         setTimeout } from '@timers';

// standard types
import Array    from '@Array';
import Boolean  from '@Boolean';
import Date     from '@Date';
import Function from '@Function';
import Map      from '@Map';
import Number   from '@Number';
import Object   from '@Object';
import Proxy    from '@reflect';
import RegExp   from '@RegExp';
import Set      from '@Set';
import String   from '@String';
import WeakMap  from '@WeakMap';



// standard errors
import { Error,
         EvalError,
         RangeError,
         ReferenceError,
         SyntaxError,
         TypeError,
         URIError } from '@Error';


// standard pseudo-modules
import JSON from '@json';
import Math from '@math';

import Symbol from '@symbol';
//import Iterator from '@iter';

let StopIteration = $__StopIteration


export Array, Boolean, Date, Function, Map, Number, Object, Proxy, RegExp, Set, String, WeakMap,
       Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError,
       decodeURI, decodeURIComponent, encodeURI, encodeURIComponent, eval, isFinite, isNaN,
       parseFloat, parseInt, clearInterval, clearTimeout, setInterval, setTimeout,
       StopIteration, JSON, Math, NaN, Infinity, undefined;


