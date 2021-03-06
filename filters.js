const strftime = require("./src/util/strftime.js");
const _ = require("./src/util/underscore.js");
const isTruthy = require("./src/syntax.js").isTruthy;
const moment = require("moment");

var escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&#34;",
  "'": "&#39;"
};

var unescapeMap = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&#34;": '"',
  "&#39;": "'"
};

var filters = {
  abs: v => Math.abs(v),
  append: (v, arg) => v + arg,
  capitalize: str =>
    stringify(str)
      .charAt(0)
      .toUpperCase() + str.slice(1),
  ceil: v => Math.ceil(v),
  concat: (v, arg) => Array.prototype.concat.call(v, arg),
  date: (v, arg) => {
    var date = v;
    if (v === "now") {
      date = new Date();
    } else if (_.isString(v)) {
      date = new Date(v);
    }
    return isValidDate(date) ? strftime(date, arg) : v;
  },
  default: (v, arg) => (isTruthy(v) ? v : arg),
  divided_by: (v, arg) => divide(v, arg),
  downcase: v => v.toLowerCase(),
  escape: escape,
  escape_once: str => escape(unescape(str)),
  first: v => v[0],
  floor: v => Math.floor(v),
  join: (v, arg) => v.join(arg),
  last: v => v[v.length - 1],
  lstrip: v => stringify(v).replace(/^\s+/, ""),
  map: (arr, arg) => arr.map(v => v[arg]),
  minus: (v, arg) => subtract(v, arg),
  modulo: bindFixed((v, arg) => v % arg),
  newline_to_br: v => v.replace(/\n/g, "<br />"),
  plus: (v, arg) => add(v, arg),
  prepend: (v, arg) => arg + v,
  remove: (v, arg) => v.split(arg).join(""),
  remove_first: (v, l) => v.replace(l, ""),
  replace: (v, pattern, replacement) =>
    stringify(v)
      .split(pattern)
      .join(replacement),
  replace_first: (v, arg1, arg2) => stringify(v).replace(arg1, arg2),
  reverse: v => v.reverse(),
  round: (v, arg) => {
    var amp = Math.pow(10, arg || 0);
    return Math.round(v * amp, arg) / amp;
  },
  rstrip: str => stringify(str).replace(/\s+$/, ""),
  size: v => v.length,
  slice: (v, begin, length) =>
    v.substr(begin, length === undefined ? 1 : length),
  sort: (v, arg) => v.sort(arg),
  split: (v, arg) => stringify(v).split(arg),
  strip: v => stringify(v).trim(),
  strip_html: v => stringify(v).replace(/<\/?\s*\w+\s*\/?>/g, ""),
  strip_newlines: v => stringify(v).replace(/\n/g, ""),
  times: (v, arg) => multiply(v, arg),
  truncate: (v, l, o) => {
    v = stringify(v);
    o = o === undefined ? "..." : o;
    l = l || 16;
    if (v.length <= l) return v;
    return v.substr(0, l - o.length) + o;
  },
  truncatewords: (v, l, o) => {
    if (o === undefined) o = "...";
    var arr = v.split(" ");
    var ret = arr.slice(0, l).join(" ");
    if (arr.length > l) ret += o;
    return ret;
  },
  uniq: function(arr) {
    var u = {};
    return (arr || []).filter(val => {
      if (u.hasOwnProperty(val)) {
        return false;
      }
      u[val] = true;
      return true;
    });
  },
  upcase: str => stringify(str).toUpperCase(),
  updateAttribute: (v, attr, arg) => updateAttribute(v, attr, arg),
  updateTypeAttribute: (v, arg) => updateTypeAttribute(v, arg),
  url_encode: encodeURIComponent
};

const CF_DATE_FORMAT = "YYYY-MM-DD"
const ISO_STRING_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSZ"

function escape(str) {
  return stringify(str).replace(/&|<|>|"|'/g, m => escapeMap[m]);
}

function unescape(str) {
  return stringify(str).replace(/&(amp|lt|gt|#34|#39);/g, m => unescapeMap[m]);
}

function getFixed(v) {
  var p = (v + "").split(".");
  return p.length > 1 ? p[1].length : 0;
}

function getMaxFixed(l, r) {
  return Math.max(getFixed(l), getFixed(r));
}

function stringify(obj) {
  return obj + "";
}

function bindFixed(cb) {
  return (l, r) => {
    var f = getMaxFixed(l, r);
    return cb(l, r).toFixed(f);
  };
}

function registerAll(liquid) {
  return _.forOwn(filters, (func, name) => liquid.registerFilter(name, func));
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

function multiply(v, arg) {
  return performOperations(v, arg, "MULTIPLY");
}

function filterNumericKeysFromObject(obj) {
  return Object.keys(obj).filter(key => !Number.isNaN(parseInt(obj[key])));
}

/* Cloning function required to avoid memory leak when performning functions on objects */
function getObjectValues(obj) {
  let resultObj = {};
  let keys = Object.keys(obj);
  keys.forEach(key => {
    resultObj[key] = obj[key];
  });
  return resultObj;
}

function isObject(arg) {
  return typeof(arg) === "object" && arg !== null
}

function calculateDurationInDays(toDate, fromDate) {
  /* Added moments to set time to start of Day (12 am) to avoid any discrepencies in calculation*/
  const acutaltoDateMoment = moment(toDate).startOf('date');
  const actualFromDateMoment = moment(fromDate).startOf('date');
  const durationInDays = moment(acutaltoDateMoment).diff(moment(actualFromDateMoment), "days");
  if(durationInDays < 0) {
    console.warn("toDate should be greater than fromDate");
    return {
      type: "DAYS",
      value: 0,
      days: 0
    }
  }
  return {
    type: "DAYS",
    value: durationInDays,
    days: durationInDays
  }
}

function checkIfDurationObjects(v, arg) {
  const units = ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'];
  if(units.indexOf(v.type) != -1 && units.indexOf(arg.type) != -1) {
    return true;
  }
  return false;
}
function subtract(v, arg) {
  return performOperations(v, arg, "SUBTRACT");
}

function divide(v, arg) {
  return performOperations(v, arg, "DIVIDE");
}

function add(v, arg) {
  return performOperations(v, arg, "ADD");
}

function isValidDateString(dateString) {
  return typeof dateString === "string" && 
  (moment(dateString, moment.ISO_8601, true).isValid() || 
  moment(dateString, CF_DATE_FORMAT, true).isValid());
}

function isDefinedAndNotNullArg(argument) {
  return argument !== null && argument !== undefined
}

function isValidNumber(argument) {
  return isDefinedAndNotNullArg(argument) && !isNaN(argument)
}

function updateTypeAttribute(v, arg) {
  return updateAttribute(v, "type", arg)
}

function updateAttribute(v, attr, arg) {
  if(isDefinedAndNotNullArg(v)) {
    if(isObject(v)) {
      return Object.assign(v, {[`${attr}`]: arg})
    }
    console.warn("Not valid arguments for operation")
    return null
  } else {
    return {[`${attr}`]: arg}
  }
}

function isBothArgsValidDateOrDateString(v, arg) {
  return (Object.prototype.toString.call(v) === '[object Date]' 
  && Object.prototype.toString.call(arg) === '[object Date]') || 
  ((Object.prototype.toString.call(v) === '[object Date]'  && isValidDateString(arg)) ||
  (isValidDateString(v) && Object.prototype.toString.call(arg) === '[object Date]')) ||
  (isValidDateString(v) && isValidDateString(arg))
}

function performOperations(v, arg, operation) {
  if(isBothArgsValidDateOrDateString(v,arg)) {
    return operationOnDates(v, arg, operation);
  } else if ((Object.prototype.toString.call(v) === '[object Date]' || isValidDateString(v)) && isObject(arg)) {
    const addType = ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'];
    const {value, type} = arg;
    if (value && addType.indexOf(type) != -1) {
      return operationOnDateDuration(v, arg, operation);
    }else {
      console.warn("duration obj is incorrect")
      return v;
    }
  } else if (isObject(v) && isObject(arg)) {
    const isDurationObjects = checkIfDurationObjects(v, arg)
    if(isDurationObjects) {
      if(v.days != null && arg.days != null) {
        const total_days = operationOnItem(v.days, arg.days, operation);
        return {
          type: "DAYS",
          value: total_days,
          days: total_days
        }
      }else {
        return {
          type: "DAYS",
          value: 0,
          days: 0
        }
      }  
    }
    let result = Object.assign(getObjectValues(arg),getObjectValues(v))
    const numberKeysOfArg = filterNumericKeysFromObject(arg);
    const numberKeysOfV = filterNumericKeysFromObject(v);
    const commonNumericKeys = numberKeysOfV.filter(elem => numberKeysOfArg.indexOf(elem) !== -1)
    if(commonNumericKeys.length > 0) {
      numberKeysOfArg.forEach(key => {
        result[key] = operationOnItem(v[key],arg[key], operation);
      })
      return result;
    } else {
      console.warn("The objects don't have any common numeric attributes")
    }
  } else if (typeof(v) === "number" && isObject(arg)) {
    let result = getObjectValues(arg)
    const numberKeys = filterNumericKeysFromObject(arg);
    numberKeys.forEach(key => {
      result[key] = operationOnItem(v, arg[key], operation);
    })
    return result
  } else if (isObject(v) && typeof(arg) === "number") {
    let result = getObjectValues(v)
    const numberKeys = filterNumericKeysFromObject(v);
    numberKeys.forEach(key => {
      result[key] = operationOnItem(v[key], arg, operation)
    })
    return result
  } else if((typeof(v) === "object" && !isDefinedAndNotNullArg(arg)) || 
    ((typeof(arg) === "object" && !isDefinedAndNotNullArg(v)))){
       /*Added this for cases where one arg is undefined but another is object such as date empty and duration present */
      return null
  } 
  else {
    return operationOnItem(v,arg, operation);
  }
}

function addOrSubtractOperationOnItem(v, arg, operation) {
  if(!isValidNumber(v) && !isValidNumber(arg)) {
    return 0
  } else if(isValidNumber(v) && !isValidNumber(arg)) {
    return v;
  } else if(!isValidNumber(v) && isValidNumber(arg)) {
    switch(operation) {
      case "ADD":
        return arg
      case "SUBTRACT":
        return -arg
    }
  } else {
    switch (operation) {
      case "ADD":
        return Number(v) + Number(arg);
      case "SUBTRACT":
        return Number(v) - Number(arg);
    }
  }
}

function divideOrMultiplyOperationOnItem(v, arg, operation) {
  if(!isValidNumber(v) || !isValidNumber(arg)) {
    return 0
  } else {
    switch (operation) {
      case "DIVIDE":
        return parseFloat((Number(v)/ Number(arg) ).toFixed(3));
      case "MULTIPLY":
        return Number(v) * Number(arg);
    }
  }
}

function operationOnItem(v, arg, operation) {
  switch (operation) {
    case "ADD":
    case "SUBTRACT":
      return addOrSubtractOperationOnItem(v, arg, operation)
    case "DIVIDE":
    case "MULTIPLY":
      return divideOrMultiplyOperationOnItem(v, arg, operation)
  }
}

function operationOnDateDuration(v, arg, operation) {
  switch(operation) {
    case "ADD":
      return new Date(moment(v).add(arg.value, arg.type));
    case "SUBTRACT":
      return new Date(moment(v).subtract(arg.value, arg.type));
    default:
      console.warn(`${operation}, not supported`);
      return null
  }
}

function operationOnDates(v, arg, operation) {
  switch(operation) {
    case "SUBTRACT":
      return calculateDurationInDays(v, arg);
    default:
      console.warn(`${operation}, not supported`);
      return null
  }
}


registerAll.filters = filters;
module.exports = registerAll;
