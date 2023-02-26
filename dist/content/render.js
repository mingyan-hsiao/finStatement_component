var SDKComponent = function(React2) {
  var _a;
  "use strict";
  function _interopDefaultLegacy(e) {
    return e && typeof e === "object" && "default" in e ? e : { "default": e };
  }
  var React__default = /* @__PURE__ */ _interopDefaultLegacy(React2);
  let {
    useLocale,
    useContext,
    usePrompts,
    useQueryBuilder,
    useCustomQuery,
    useQuery,
    LoadingOverlay,
    ErrorOverlay,
    usePrivateData
  } = (_a = window.incortaSDKApi) != null ? _a : {};
  function tidy(items, ...fns) {
    if (typeof items === "function") {
      throw new Error("You must supply the data as the first argument to tidy()");
    }
    let result = items;
    for (const fn of fns) {
      if (fn) {
        result = fn(result);
      }
    }
    return result;
  }
  function filter(filterFn) {
    const _filter = (items) => items.filter(filterFn);
    return _filter;
  }
  function singleOrArray(d) {
    return d == null ? [] : Array.isArray(d) ? d : [d];
  }
  class Adder {
    constructor() {
      this._partials = new Float64Array(32);
      this._n = 0;
    }
    add(x) {
      const p = this._partials;
      let i = 0;
      for (let j = 0; j < this._n && j < 32; j++) {
        const y = p[j], hi = x + y, lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
        if (lo)
          p[i++] = lo;
        x = hi;
      }
      p[i] = x;
      this._n = i + 1;
      return this;
    }
    valueOf() {
      const p = this._partials;
      let n = this._n, x, y, lo, hi = 0;
      if (n > 0) {
        hi = p[--n];
        while (n > 0) {
          x = hi;
          y = p[--n];
          hi = x + y;
          lo = y - (hi - x);
          if (lo)
            break;
        }
        if (n > 0 && (lo < 0 && p[n - 1] < 0 || lo > 0 && p[n - 1] > 0)) {
          y = lo * 2;
          x = hi + y;
          if (y == x - hi)
            hi = x;
        }
      }
      return hi;
    }
  }
  function fsum(values, valueof) {
    const adder = new Adder();
    if (valueof === void 0) {
      for (let value of values) {
        if (value = +value) {
          adder.add(value);
        }
      }
    } else {
      let index2 = -1;
      for (let value of values) {
        if (value = +valueof(value, ++index2, values)) {
          adder.add(value);
        }
      }
    }
    return +adder;
  }
  class InternMap extends Map {
    constructor(entries, key = keyof) {
      super();
      Object.defineProperties(this, { _intern: { value: /* @__PURE__ */ new Map() }, _key: { value: key } });
      if (entries != null)
        for (const [key2, value] of entries)
          this.set(key2, value);
    }
    get(key) {
      return super.get(intern_get(this, key));
    }
    has(key) {
      return super.has(intern_get(this, key));
    }
    set(key, value) {
      return super.set(intern_set(this, key), value);
    }
    delete(key) {
      return super.delete(intern_delete(this, key));
    }
  }
  function intern_get({ _intern, _key }, value) {
    const key = _key(value);
    return _intern.has(key) ? _intern.get(key) : value;
  }
  function intern_set({ _intern, _key }, value) {
    const key = _key(value);
    if (_intern.has(key))
      return _intern.get(key);
    _intern.set(key, value);
    return value;
  }
  function intern_delete({ _intern, _key }, value) {
    const key = _key(value);
    if (_intern.has(key)) {
      value = _intern.get(value);
      _intern.delete(key);
    }
    return value;
  }
  function keyof(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }
  function identity$1(x) {
    return x;
  }
  function group(values, ...keys) {
    return nest(values, identity$1, identity$1, keys);
  }
  function nest(values, map, reduce, keys) {
    return function regroup(values2, i) {
      if (i >= keys.length)
        return reduce(values2);
      const groups = new InternMap();
      const keyof2 = keys[i++];
      let index2 = -1;
      for (const value of values2) {
        const key = keyof2(value, ++index2, values2);
        const group2 = groups.get(key);
        if (group2)
          group2.push(value);
        else
          groups.set(key, [value]);
      }
      for (const [key, values3] of groups) {
        groups.set(key, regroup(values3, i));
      }
      return map(groups);
    }(values, 0);
  }
  function summarize(summarizeSpec, options) {
    const _summarize = (items) => {
      options = options != null ? options : {};
      const summarized = {};
      const keys = Object.keys(summarizeSpec);
      for (const key of keys) {
        summarized[key] = summarizeSpec[key](items);
      }
      if (options.rest && items.length) {
        const objectKeys = Object.keys(items[0]);
        for (const objKey of objectKeys) {
          if (keys.includes(objKey)) {
            continue;
          }
          summarized[objKey] = options.rest(objKey)(items);
        }
      }
      return [summarized];
    };
    return _summarize;
  }
  function mutate(mutateSpec) {
    const _mutate = (items) => {
      const mutatedItems = items.map((d) => ({ ...d }));
      let i = 0;
      for (const mutatedItem of mutatedItems) {
        for (const key in mutateSpec) {
          const mutateSpecValue = mutateSpec[key];
          const mutatedResult = typeof mutateSpecValue === "function" ? mutateSpecValue(mutatedItem, i, mutatedItems) : mutateSpecValue;
          mutatedItem[key] = mutatedResult;
        }
        ++i;
      }
      return mutatedItems;
    };
    return _mutate;
  }
  function assignGroupKeys(d, keys) {
    if (d == null || typeof d !== "object" || Array.isArray(d))
      return d;
    const keysObj = Object.fromEntries(keys.filter((key) => typeof key[0] !== "function" && key[0] != null));
    return Object.assign(keysObj, d);
  }
  function groupTraversal(grouped, outputGrouped, keys, addSubgroup, addLeaves, level = 0) {
    for (const [key, value] of grouped.entries()) {
      const keysHere = [...keys, key];
      if (value instanceof Map) {
        const subgroup = addSubgroup(outputGrouped, keysHere, level);
        groupTraversal(value, subgroup, keysHere, addSubgroup, addLeaves, level + 1);
      } else {
        addLeaves(outputGrouped, keysHere, value, level);
      }
    }
    return outputGrouped;
  }
  function groupMap(grouped, groupFn, keyFn = (keys) => keys[keys.length - 1]) {
    function addSubgroup(parentGrouped, keys) {
      const subgroup = /* @__PURE__ */ new Map();
      parentGrouped.set(keyFn(keys), subgroup);
      return subgroup;
    }
    function addLeaves(parentGrouped, keys, values) {
      parentGrouped.set(keyFn(keys), groupFn(values, keys));
    }
    const outputGrouped = /* @__PURE__ */ new Map();
    groupTraversal(grouped, outputGrouped, [], addSubgroup, addLeaves);
    return outputGrouped;
  }
  const identity = (d) => d;
  function isObject(obj) {
    const type = typeof obj;
    return obj != null && (type === "object" || type === "function");
  }
  function groupBy(groupKeys, fns, options) {
    if (typeof fns === "function") {
      fns = [fns];
    } else if (arguments.length === 2 && fns != null && !Array.isArray(fns)) {
      options = fns;
    }
    const _groupBy = (items) => {
      const grouped = makeGrouped(items, groupKeys);
      const results = runFlow(grouped, fns, options == null ? void 0 : options.addGroupKeys);
      if (options == null ? void 0 : options.export) {
        switch (options.export) {
          case "grouped":
            return results;
          case "levels":
            return exportLevels(results, options);
          case "entries-obj":
          case "entriesObject":
            return exportLevels(results, {
              ...options,
              export: "levels",
              levels: ["entries-object"]
            });
          default:
            return exportLevels(results, {
              ...options,
              export: "levels",
              levels: [options.export]
            });
        }
      }
      const ungrouped = ungroup(results, options == null ? void 0 : options.addGroupKeys);
      return ungrouped;
    };
    return _groupBy;
  }
  groupBy.grouped = (options) => ({ ...options, export: "grouped" });
  groupBy.entries = (options) => ({ ...options, export: "entries" });
  groupBy.entriesObject = (options) => ({ ...options, export: "entries-object" });
  groupBy.object = (options) => ({ ...options, export: "object" });
  groupBy.map = (options) => ({ ...options, export: "map" });
  groupBy.keys = (options) => ({ ...options, export: "keys" });
  groupBy.values = (options) => ({ ...options, export: "values" });
  groupBy.levels = (options) => ({ ...options, export: "levels" });
  function runFlow(items, fns, addGroupKeys) {
    let result = items;
    if (!(fns == null ? void 0 : fns.length))
      return result;
    for (const fn of fns) {
      if (!fn)
        continue;
      result = groupMap(result, (items2, keys) => {
        const context = { groupKeys: keys };
        let leafItemsMapped = fn(items2, context);
        if (addGroupKeys !== false) {
          leafItemsMapped = leafItemsMapped.map((item) => assignGroupKeys(item, keys));
        }
        return leafItemsMapped;
      });
    }
    return result;
  }
  function makeGrouped(items, groupKeys) {
    const groupKeyFns = singleOrArray(groupKeys).map((key, i) => {
      const keyFn = typeof key === "function" ? key : (d) => d[key];
      const keyCache = /* @__PURE__ */ new Map();
      return (d) => {
        const keyValue = keyFn(d);
        const keyValueOf = isObject(keyValue) ? keyValue.valueOf() : keyValue;
        if (keyCache.has(keyValueOf)) {
          return keyCache.get(keyValueOf);
        }
        const keyWithName = [key, keyValue];
        keyCache.set(keyValueOf, keyWithName);
        return keyWithName;
      };
    });
    const grouped = group(items, ...groupKeyFns);
    return grouped;
  }
  function ungroup(grouped, addGroupKeys) {
    const items = [];
    groupTraversal(grouped, items, [], identity, (root, keys, values) => {
      let valuesToAdd = values;
      if (addGroupKeys !== false) {
        valuesToAdd = values.map((d) => assignGroupKeys(d, keys));
      }
      root.push(...valuesToAdd);
    });
    return items;
  }
  const defaultCompositeKey = (keys) => keys.join("/");
  function processFromGroupsOptions(options) {
    var _a2;
    const {
      flat,
      single,
      mapLeaf = identity,
      mapLeaves = identity,
      addGroupKeys
    } = options;
    let compositeKey;
    if (options.flat) {
      compositeKey = (_a2 = options.compositeKey) != null ? _a2 : defaultCompositeKey;
    }
    const groupFn = (values, keys) => {
      return single ? mapLeaf(addGroupKeys === false ? values[0] : assignGroupKeys(values[0], keys)) : mapLeaves(values.map((d) => mapLeaf(addGroupKeys === false ? d : assignGroupKeys(d, keys))));
    };
    const keyFn = flat ? (keys) => compositeKey(keys.map((d) => d[1])) : (keys) => keys[keys.length - 1][1];
    return { groupFn, keyFn };
  }
  function exportLevels(grouped, options) {
    const { groupFn, keyFn } = processFromGroupsOptions(options);
    let { mapEntry = identity } = options;
    const { levels = ["entries"] } = options;
    const levelSpecs = [];
    for (const levelOption of levels) {
      switch (levelOption) {
        case "entries":
        case "entries-object":
        case "entries-obj":
        case "entriesObject": {
          const levelMapEntry = (levelOption === "entries-object" || levelOption === "entries-obj" || levelOption === "entriesObject") && options.mapEntry == null ? ([key, values]) => ({ key, values }) : mapEntry;
          levelSpecs.push({
            id: "entries",
            createEmptySubgroup: () => [],
            addSubgroup: (parentGrouped, newSubgroup, key, level) => {
              parentGrouped.push(levelMapEntry([key, newSubgroup], level));
            },
            addLeaf: (parentGrouped, key, values, level) => {
              parentGrouped.push(levelMapEntry([key, values], level));
            }
          });
          break;
        }
        case "map":
          levelSpecs.push({
            id: "map",
            createEmptySubgroup: () => /* @__PURE__ */ new Map(),
            addSubgroup: (parentGrouped, newSubgroup, key) => {
              parentGrouped.set(key, newSubgroup);
            },
            addLeaf: (parentGrouped, key, values) => {
              parentGrouped.set(key, values);
            }
          });
          break;
        case "object":
          levelSpecs.push({
            id: "object",
            createEmptySubgroup: () => ({}),
            addSubgroup: (parentGrouped, newSubgroup, key) => {
              parentGrouped[key] = newSubgroup;
            },
            addLeaf: (parentGrouped, key, values) => {
              parentGrouped[key] = values;
            }
          });
          break;
        case "keys":
          levelSpecs.push({
            id: "keys",
            createEmptySubgroup: () => [],
            addSubgroup: (parentGrouped, newSubgroup, key) => {
              parentGrouped.push([key, newSubgroup]);
            },
            addLeaf: (parentGrouped, key) => {
              parentGrouped.push(key);
            }
          });
          break;
        case "values":
          levelSpecs.push({
            id: "values",
            createEmptySubgroup: () => [],
            addSubgroup: (parentGrouped, newSubgroup) => {
              parentGrouped.push(newSubgroup);
            },
            addLeaf: (parentGrouped, key, values) => {
              parentGrouped.push(values);
            }
          });
          break;
        default: {
          if (typeof levelOption === "object") {
            levelSpecs.push(levelOption);
          }
        }
      }
    }
    const addSubgroup = (parentGrouped, keys, level) => {
      var _a2, _b;
      if (options.flat) {
        return parentGrouped;
      }
      const levelSpec = (_a2 = levelSpecs[level]) != null ? _a2 : levelSpecs[levelSpecs.length - 1];
      const nextLevelSpec = (_b = levelSpecs[level + 1]) != null ? _b : levelSpec;
      const newSubgroup = nextLevelSpec.createEmptySubgroup();
      levelSpec.addSubgroup(parentGrouped, newSubgroup, keyFn(keys), level);
      return newSubgroup;
    };
    const addLeaf = (parentGrouped, keys, values, level) => {
      var _a2;
      const levelSpec = (_a2 = levelSpecs[level]) != null ? _a2 : levelSpecs[levelSpecs.length - 1];
      levelSpec.addLeaf(parentGrouped, keyFn(keys), groupFn(values, keys), level);
    };
    const initialOutputObject = levelSpecs[0].createEmptySubgroup();
    return groupTraversal(grouped, initialOutputObject, [], addSubgroup, addLeaf);
  }
  function sum(key, options) {
    let keyFn = typeof key === "function" ? key : (d) => d[key];
    if (options == null ? void 0 : options.predicate) {
      const originalKeyFn = keyFn;
      const predicate = options.predicate;
      keyFn = (d, index2, array) => predicate(d, index2, array) ? originalKeyFn(d, index2, array) : 0;
    }
    return (items) => fsum(items, keyFn);
  }
  function autodetectByMap(itemsA, itemsB) {
    if (itemsA.length === 0 || itemsB.length === 0)
      return {};
    const keysA = Object.keys(itemsA[0]);
    const keysB = Object.keys(itemsB[0]);
    const byMap = {};
    for (const key of keysA) {
      if (keysB.includes(key)) {
        byMap[key] = key;
      }
    }
    return byMap;
  }
  function makeByMap(by) {
    if (Array.isArray(by)) {
      const byMap = {};
      for (const key of by) {
        byMap[key] = key;
      }
      return byMap;
    } else if (typeof by === "object") {
      return by;
    }
    return { [by]: by };
  }
  function isMatch(d, j, byMap) {
    for (const jKey in byMap) {
      const dKey = byMap[jKey];
      if (d[dKey] !== j[jKey]) {
        return false;
      }
    }
    return true;
  }
  function leftJoin(itemsToJoin, options) {
    const _leftJoin = (items) => {
      if (!itemsToJoin.length)
        return items;
      const byMap = (options == null ? void 0 : options.by) == null ? autodetectByMap(items, itemsToJoin) : makeByMap(options.by);
      const joinObjectKeys = Object.keys(itemsToJoin[0]);
      const joined = items.flatMap((d) => {
        const matches = itemsToJoin.filter((j) => isMatch(d, j, byMap));
        if (matches.length) {
          return matches.map((j) => ({ ...d, ...j }));
        }
        const undefinedFill = Object.fromEntries(joinObjectKeys.filter((key) => d[key] == null).map((key) => [key, void 0]));
        return { ...d, ...undefinedFill };
      });
      return joined;
    };
    return _leftJoin;
  }
  function keysFromItems(items) {
    if (items.length < 1)
      return [];
    const keys = Object.keys(items[0]);
    return keys;
  }
  function everything() {
    return (items) => {
      const keys = keysFromItems(items);
      return keys;
    };
  }
  function processSelectors(items, selectKeys) {
    let processedSelectKeys = [];
    for (const keyInput of singleOrArray(selectKeys)) {
      if (typeof keyInput === "function") {
        processedSelectKeys.push(...keyInput(items));
      } else {
        processedSelectKeys.push(keyInput);
      }
    }
    if (processedSelectKeys.length && processedSelectKeys[0][0] === "-") {
      processedSelectKeys = [...everything()(items), ...processedSelectKeys];
    }
    const negationMap = {};
    const keysWithoutNegations = [];
    for (let k = processedSelectKeys.length - 1; k >= 0; k--) {
      const key = processedSelectKeys[k];
      if (key[0] === "-") {
        negationMap[key.substring(1)] = true;
        continue;
      }
      if (negationMap[key]) {
        negationMap[key] = false;
        continue;
      }
      keysWithoutNegations.unshift(key);
    }
    processedSelectKeys = Array.from(new Set(keysWithoutNegations));
    return processedSelectKeys;
  }
  function pivotLonger(options) {
    const _pivotLonger = (items) => {
      var _a2;
      const { namesTo, valuesTo, namesSep = "_" } = options;
      const cols = (_a2 = options.cols) != null ? _a2 : [];
      const colsKeys = processSelectors(items, cols);
      const namesToKeys = Array.isArray(namesTo) ? namesTo : [namesTo];
      const valuesToKeys = Array.isArray(valuesTo) ? valuesTo : [valuesTo];
      const hasMultipleNamesTo = namesToKeys.length > 1;
      const hasMultipleValuesTo = valuesToKeys.length > 1;
      const longer = [];
      for (const item of items) {
        const remainingKeys = Object.keys(item).filter((key) => !colsKeys.includes(key));
        const baseObj = {};
        for (const key of remainingKeys) {
          baseObj[key] = item[key];
        }
        const nameValueKeysWithoutValuePrefix = hasMultipleValuesTo ? Array.from(new Set(colsKeys.map((key) => key.substring(key.indexOf(namesSep) + 1)))) : colsKeys;
        for (const nameValue of nameValueKeysWithoutValuePrefix) {
          const entryObj = { ...baseObj };
          for (const valueKey of valuesToKeys) {
            const itemKey = hasMultipleValuesTo ? `${valueKey}${namesSep}${nameValue}` : nameValue;
            const nameValueParts = hasMultipleNamesTo ? nameValue.split(namesSep) : [nameValue];
            let i = 0;
            for (const nameKey of namesToKeys) {
              const nameValuePart = nameValueParts[i++];
              entryObj[nameKey] = nameValuePart;
              entryObj[valueKey] = item[itemKey];
            }
          }
          longer.push(entryObj);
        }
      }
      return longer;
    };
    return _pivotLonger;
  }
  var App = "";
  const FinStatement = ({ context, prompts, data, drillDown }) => {
    var _a2, _b, _c;
    console.log(data);
    const dims = (_b = (_a2 = data.rowHeaders) == null ? void 0 : _a2.map((cell) => {
      return { field: cell.id, header: cell.label, type: "dimention" };
    })) != null ? _b : [];
    const maasures = data.measureHeaders.map((cell) => {
      return { field: cell.id, header: cell.label, type: "measure" };
    });
    const cols = dims.concat(maasures);
    let colsName = cols.map((a) => a.header);
    let maasureName = maasures.map((a) => a.header);
    let _rawData = data.data.map((col) => {
      let colsName2 = col;
      return colsName2;
    });
    let raw_input = [];
    _rawData.map(function(d) {
      let r = {};
      for (let i = 0; i < colsName.length; i++) {
        r[colsName[i]] = d[i].formatted;
      }
      raw_input.push(r);
    });
    raw_input.map(function(d) {
      d.Period = parseFloat(d.Period);
    });
    const curr = parseInt((_c = data.data[0].at(3)) == null ? void 0 : _c.value);
    raw_input = raw_input.filter((d) => d.Period == curr || d.Period == curr - 1);
    console.log(raw_input);
    let dt = tidy(
      raw_input,
      pivotLonger({
        cols: maasureName,
        namesTo: "item",
        valuesTo: "amount"
      })
    );
    console.log(dt);
    dt.map(function(d) {
      d.Period = parseFloat(d.Period);
      d.amount = parseFloat(d.amount);
    });
    let new_dt = tidy(
      dt,
      groupBy(["Period", "item"], [summarize({ total: sum("amount") })])
    );
    let currdata = tidy(new_dt, filter((d) => d.Period === curr));
    let lastdata = tidy(new_dt, filter((d) => d.Period === curr - 1));
    let lastyrdata = lastdata.map(({
      total: totallast,
      ...rest
    }) => ({
      totallast,
      ...rest
    }));
    let twodata = tidy(
      currdata,
      leftJoin(lastyrdata, { by: "item" })
    );
    console.log("two");
    console.log(twodata);
    function formatAsPercent(num) {
      return `${Math.floor(num * 100)}%`;
    }
    let ratio_dt = tidy(twodata, mutate({
      rate: (d) => formatAsPercent((d.total - d.totallast) / d.totallast),
      curr_ratio: (d) => {
        var _a3;
        return formatAsPercent(d.total / ((_a3 = twodata.at(0)) == null ? void 0 : _a3.total));
      },
      last_ratio: (d) => {
        var _a3;
        return formatAsPercent(d.totallast / ((_a3 = twodata.at(0)) == null ? void 0 : _a3.totallast));
      }
    }));
    ratio_dt.pop();
    console.log("output");
    console.log(ratio_dt);
    const DisplayData = ratio_dt.map(
      (info) => {
        return /* @__PURE__ */ React__default["default"].createElement("tr", null, /* @__PURE__ */ React__default["default"].createElement("td", null, info.item), /* @__PURE__ */ React__default["default"].createElement("td", null, info.total), /* @__PURE__ */ React__default["default"].createElement("td", null, info.curr_ratio), /* @__PURE__ */ React__default["default"].createElement("td", null, info.totallast), /* @__PURE__ */ React__default["default"].createElement("td", null, info.last_ratio), /* @__PURE__ */ React__default["default"].createElement("td", null, info.rate));
      }
    );
    return /* @__PURE__ */ React__default["default"].createElement("div", null, /* @__PURE__ */ React__default["default"].createElement("h2", null, curr, " Income Statement"), /* @__PURE__ */ React__default["default"].createElement("table", {
      id: "customers"
    }, /* @__PURE__ */ React__default["default"].createElement("thead", null, /* @__PURE__ */ React__default["default"].createElement("tr", null, /* @__PURE__ */ React__default["default"].createElement("th", null, "Item"), /* @__PURE__ */ React__default["default"].createElement("th", null, "Current year"), /* @__PURE__ */ React__default["default"].createElement("th", null, "Current ratio"), /* @__PURE__ */ React__default["default"].createElement("th", null, "Last year"), /* @__PURE__ */ React__default["default"].createElement("th", null, "Last ratio"), /* @__PURE__ */ React__default["default"].createElement("th", null, "Percentage Change"))), /* @__PURE__ */ React__default["default"].createElement("tbody", null, DisplayData)));
  };
  var styles = "";
  var index = () => {
    const { prompts, drillDown } = usePrompts();
    const { data, context, isLoading, isError, error } = useQuery(useContext(), prompts);
    return /* @__PURE__ */ React__default["default"].createElement(ErrorOverlay, {
      isError,
      error
    }, /* @__PURE__ */ React__default["default"].createElement(LoadingOverlay, {
      isLoading,
      data
    }, context && data ? /* @__PURE__ */ React__default["default"].createElement(FinStatement, {
      data,
      context,
      prompts,
      drillDown
    }) : null));
  };
  return index;
}(React);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLmpzIiwic291cmNlcyI6WyIuLi8uLi9ub2RlX21vZHVsZXMvQGluY29ydGEtb3JnL2NvbXBvbmVudC1zZGsvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvdGlkeS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9maWx0ZXIuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvaGVscGVycy9zaW5nbGVPckFycmF5LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9mc3VtLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2ludGVybm1hcC9zcmMvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2lkZW50aXR5LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9ncm91cC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9zdW1tYXJpemUuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvbXV0YXRlLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL2hlbHBlcnMvYXNzaWduR3JvdXBLZXlzLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL2hlbHBlcnMvZ3JvdXBUcmF2ZXJzYWwuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvaGVscGVycy9ncm91cE1hcC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9oZWxwZXJzL2lkZW50aXR5LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL2hlbHBlcnMvaXNPYmplY3QuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvZ3JvdXBCeS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9zdW1tYXJ5L3N1bS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9pbm5lckpvaW4uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvbGVmdEpvaW4uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvaGVscGVycy9rZXlzRnJvbUl0ZW1zLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL3NlbGVjdG9ycy9ldmVyeXRoaW5nLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL3NlbGVjdC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9waXZvdExvbmdlci5qcyIsIi4uLy4uL3NyYy9GaW5TdGF0ZW1lbnQudHN4IiwiLi4vLi4vc3JjL2luZGV4LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQge1xuICB1c2VMb2NhbGUsXG4gIHVzZUNvbnRleHQsXG4gIHVzZVByb21wdHMsXG4gIHVzZVF1ZXJ5QnVpbGRlcixcbiAgdXNlQ3VzdG9tUXVlcnksXG4gIHVzZVF1ZXJ5LFxuICBMb2FkaW5nT3ZlcmxheSxcbiAgRXJyb3JPdmVybGF5LFxuICB1c2VQcml2YXRlRGF0YVxufSA9IHdpbmRvdy5pbmNvcnRhU0RLQXBpID8/IHt9O1xuXG5leHBvcnQge1xuICB1c2VMb2NhbGUsXG4gIHVzZUNvbnRleHQsXG4gIHVzZVByb21wdHMsXG4gIHVzZVF1ZXJ5QnVpbGRlcixcbiAgdXNlQ3VzdG9tUXVlcnksXG4gIHVzZVF1ZXJ5LFxuICBMb2FkaW5nT3ZlcmxheSxcbiAgRXJyb3JPdmVybGF5LFxuICB1c2VQcml2YXRlRGF0YVxufTtcbiIsImZ1bmN0aW9uIHRpZHkoaXRlbXMsIC4uLmZucykge1xuICBpZiAodHlwZW9mIGl0ZW1zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBzdXBwbHkgdGhlIGRhdGEgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRpZHkoKVwiKTtcbiAgfVxuICBsZXQgcmVzdWx0ID0gaXRlbXM7XG4gIGZvciAoY29uc3QgZm4gb2YgZm5zKSB7XG4gICAgaWYgKGZuKSB7XG4gICAgICByZXN1bHQgPSBmbihyZXN1bHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgeyB0aWR5IH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD10aWR5LmpzLm1hcFxuIiwiZnVuY3Rpb24gZmlsdGVyKGZpbHRlckZuKSB7XG4gIGNvbnN0IF9maWx0ZXIgPSAoaXRlbXMpID0+IGl0ZW1zLmZpbHRlcihmaWx0ZXJGbik7XG4gIHJldHVybiBfZmlsdGVyO1xufVxuXG5leHBvcnQgeyBmaWx0ZXIgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZpbHRlci5qcy5tYXBcbiIsImZ1bmN0aW9uIHNpbmdsZU9yQXJyYXkoZCkge1xuICByZXR1cm4gZCA9PSBudWxsID8gW10gOiBBcnJheS5pc0FycmF5KGQpID8gZCA6IFtkXTtcbn1cblxuZXhwb3J0IHsgc2luZ2xlT3JBcnJheSB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2luZ2xlT3JBcnJheS5qcy5tYXBcbiIsIi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9weXRob24vY3B5dGhvbi9ibG9iL2E3NGVlYTIzOGY1YmFiYTE1Nzk3ZTJlOGI1NzBkMTUzYmM4NjkwYTcvTW9kdWxlcy9tYXRobW9kdWxlLmMjTDE0MjNcbmV4cG9ydCBjbGFzcyBBZGRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3BhcnRpYWxzID0gbmV3IEZsb2F0NjRBcnJheSgzMik7XG4gICAgdGhpcy5fbiA9IDA7XG4gIH1cbiAgYWRkKHgpIHtcbiAgICBjb25zdCBwID0gdGhpcy5fcGFydGlhbHM7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5fbiAmJiBqIDwgMzI7IGorKykge1xuICAgICAgY29uc3QgeSA9IHBbal0sXG4gICAgICAgIGhpID0geCArIHksXG4gICAgICAgIGxvID0gTWF0aC5hYnMoeCkgPCBNYXRoLmFicyh5KSA/IHggLSAoaGkgLSB5KSA6IHkgLSAoaGkgLSB4KTtcbiAgICAgIGlmIChsbykgcFtpKytdID0gbG87XG4gICAgICB4ID0gaGk7XG4gICAgfVxuICAgIHBbaV0gPSB4O1xuICAgIHRoaXMuX24gPSBpICsgMTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB2YWx1ZU9mKCkge1xuICAgIGNvbnN0IHAgPSB0aGlzLl9wYXJ0aWFscztcbiAgICBsZXQgbiA9IHRoaXMuX24sIHgsIHksIGxvLCBoaSA9IDA7XG4gICAgaWYgKG4gPiAwKSB7XG4gICAgICBoaSA9IHBbLS1uXTtcbiAgICAgIHdoaWxlIChuID4gMCkge1xuICAgICAgICB4ID0gaGk7XG4gICAgICAgIHkgPSBwWy0tbl07XG4gICAgICAgIGhpID0geCArIHk7XG4gICAgICAgIGxvID0geSAtIChoaSAtIHgpO1xuICAgICAgICBpZiAobG8pIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKG4gPiAwICYmICgobG8gPCAwICYmIHBbbiAtIDFdIDwgMCkgfHwgKGxvID4gMCAmJiBwW24gLSAxXSA+IDApKSkge1xuICAgICAgICB5ID0gbG8gKiAyO1xuICAgICAgICB4ID0gaGkgKyB5O1xuICAgICAgICBpZiAoeSA9PSB4IC0gaGkpIGhpID0geDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmc3VtKHZhbHVlcywgdmFsdWVvZikge1xuICBjb25zdCBhZGRlciA9IG5ldyBBZGRlcigpO1xuICBpZiAodmFsdWVvZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yIChsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBpZiAodmFsdWUgPSArdmFsdWUpIHtcbiAgICAgICAgYWRkZXIuYWRkKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbGV0IGluZGV4ID0gLTE7XG4gICAgZm9yIChsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBpZiAodmFsdWUgPSArdmFsdWVvZih2YWx1ZSwgKytpbmRleCwgdmFsdWVzKSkge1xuICAgICAgICBhZGRlci5hZGQodmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gK2FkZGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmN1bXN1bSh2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgY29uc3QgYWRkZXIgPSBuZXcgQWRkZXIoKTtcbiAgbGV0IGluZGV4ID0gLTE7XG4gIHJldHVybiBGbG9hdDY0QXJyYXkuZnJvbSh2YWx1ZXMsIHZhbHVlb2YgPT09IHVuZGVmaW5lZFxuICAgICAgPyB2ID0+IGFkZGVyLmFkZCgrdiB8fCAwKVxuICAgICAgOiB2ID0+IGFkZGVyLmFkZCgrdmFsdWVvZih2LCArK2luZGV4LCB2YWx1ZXMpIHx8IDApXG4gICk7XG59XG4iLCJleHBvcnQgY2xhc3MgSW50ZXJuTWFwIGV4dGVuZHMgTWFwIHtcbiAgY29uc3RydWN0b3IoZW50cmllcywga2V5ID0ga2V5b2YpIHtcbiAgICBzdXBlcigpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtfaW50ZXJuOiB7dmFsdWU6IG5ldyBNYXAoKX0sIF9rZXk6IHt2YWx1ZToga2V5fX0pO1xuICAgIGlmIChlbnRyaWVzICE9IG51bGwpIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIGVudHJpZXMpIHRoaXMuc2V0KGtleSwgdmFsdWUpO1xuICB9XG4gIGdldChrZXkpIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0KGludGVybl9nZXQodGhpcywga2V5KSk7XG4gIH1cbiAgaGFzKGtleSkge1xuICAgIHJldHVybiBzdXBlci5oYXMoaW50ZXJuX2dldCh0aGlzLCBrZXkpKTtcbiAgfVxuICBzZXQoa2V5LCB2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5zZXQoaW50ZXJuX3NldCh0aGlzLCBrZXkpLCB2YWx1ZSk7XG4gIH1cbiAgZGVsZXRlKGtleSkge1xuICAgIHJldHVybiBzdXBlci5kZWxldGUoaW50ZXJuX2RlbGV0ZSh0aGlzLCBrZXkpKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJuU2V0IGV4dGVuZHMgU2V0IHtcbiAgY29uc3RydWN0b3IodmFsdWVzLCBrZXkgPSBrZXlvZikge1xuICAgIHN1cGVyKCk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge19pbnRlcm46IHt2YWx1ZTogbmV3IE1hcCgpfSwgX2tleToge3ZhbHVlOiBrZXl9fSk7XG4gICAgaWYgKHZhbHVlcyAhPSBudWxsKSBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykgdGhpcy5hZGQodmFsdWUpO1xuICB9XG4gIGhhcyh2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5oYXMoaW50ZXJuX2dldCh0aGlzLCB2YWx1ZSkpO1xuICB9XG4gIGFkZCh2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5hZGQoaW50ZXJuX3NldCh0aGlzLCB2YWx1ZSkpO1xuICB9XG4gIGRlbGV0ZSh2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5kZWxldGUoaW50ZXJuX2RlbGV0ZSh0aGlzLCB2YWx1ZSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludGVybl9nZXQoe19pbnRlcm4sIF9rZXl9LCB2YWx1ZSkge1xuICBjb25zdCBrZXkgPSBfa2V5KHZhbHVlKTtcbiAgcmV0dXJuIF9pbnRlcm4uaGFzKGtleSkgPyBfaW50ZXJuLmdldChrZXkpIDogdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGludGVybl9zZXQoe19pbnRlcm4sIF9rZXl9LCB2YWx1ZSkge1xuICBjb25zdCBrZXkgPSBfa2V5KHZhbHVlKTtcbiAgaWYgKF9pbnRlcm4uaGFzKGtleSkpIHJldHVybiBfaW50ZXJuLmdldChrZXkpO1xuICBfaW50ZXJuLnNldChrZXksIHZhbHVlKTtcbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpbnRlcm5fZGVsZXRlKHtfaW50ZXJuLCBfa2V5fSwgdmFsdWUpIHtcbiAgY29uc3Qga2V5ID0gX2tleSh2YWx1ZSk7XG4gIGlmIChfaW50ZXJuLmhhcyhrZXkpKSB7XG4gICAgdmFsdWUgPSBfaW50ZXJuLmdldCh2YWx1ZSk7XG4gICAgX2ludGVybi5kZWxldGUoa2V5KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGtleW9mKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZS52YWx1ZU9mKCkgOiB2YWx1ZTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59XG4iLCJpbXBvcnQge0ludGVybk1hcH0gZnJvbSBcImludGVybm1hcFwiO1xuaW1wb3J0IGlkZW50aXR5IGZyb20gXCIuL2lkZW50aXR5LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdyb3VwKHZhbHVlcywgLi4ua2V5cykge1xuICByZXR1cm4gbmVzdCh2YWx1ZXMsIGlkZW50aXR5LCBpZGVudGl0eSwga2V5cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBncm91cHModmFsdWVzLCAuLi5rZXlzKSB7XG4gIHJldHVybiBuZXN0KHZhbHVlcywgQXJyYXkuZnJvbSwgaWRlbnRpdHksIGtleXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcm9sbHVwKHZhbHVlcywgcmVkdWNlLCAuLi5rZXlzKSB7XG4gIHJldHVybiBuZXN0KHZhbHVlcywgaWRlbnRpdHksIHJlZHVjZSwga2V5cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb2xsdXBzKHZhbHVlcywgcmVkdWNlLCAuLi5rZXlzKSB7XG4gIHJldHVybiBuZXN0KHZhbHVlcywgQXJyYXkuZnJvbSwgcmVkdWNlLCBrZXlzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluZGV4KHZhbHVlcywgLi4ua2V5cykge1xuICByZXR1cm4gbmVzdCh2YWx1ZXMsIGlkZW50aXR5LCB1bmlxdWUsIGtleXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5kZXhlcyh2YWx1ZXMsIC4uLmtleXMpIHtcbiAgcmV0dXJuIG5lc3QodmFsdWVzLCBBcnJheS5mcm9tLCB1bmlxdWUsIGtleXMpO1xufVxuXG5mdW5jdGlvbiB1bmlxdWUodmFsdWVzKSB7XG4gIGlmICh2YWx1ZXMubGVuZ3RoICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoXCJkdXBsaWNhdGUga2V5XCIpO1xuICByZXR1cm4gdmFsdWVzWzBdO1xufVxuXG5mdW5jdGlvbiBuZXN0KHZhbHVlcywgbWFwLCByZWR1Y2UsIGtleXMpIHtcbiAgcmV0dXJuIChmdW5jdGlvbiByZWdyb3VwKHZhbHVlcywgaSkge1xuICAgIGlmIChpID49IGtleXMubGVuZ3RoKSByZXR1cm4gcmVkdWNlKHZhbHVlcyk7XG4gICAgY29uc3QgZ3JvdXBzID0gbmV3IEludGVybk1hcCgpO1xuICAgIGNvbnN0IGtleW9mID0ga2V5c1tpKytdO1xuICAgIGxldCBpbmRleCA9IC0xO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBjb25zdCBrZXkgPSBrZXlvZih2YWx1ZSwgKytpbmRleCwgdmFsdWVzKTtcbiAgICAgIGNvbnN0IGdyb3VwID0gZ3JvdXBzLmdldChrZXkpO1xuICAgICAgaWYgKGdyb3VwKSBncm91cC5wdXNoKHZhbHVlKTtcbiAgICAgIGVsc2UgZ3JvdXBzLnNldChrZXksIFt2YWx1ZV0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlc10gb2YgZ3JvdXBzKSB7XG4gICAgICBncm91cHMuc2V0KGtleSwgcmVncm91cCh2YWx1ZXMsIGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcChncm91cHMpO1xuICB9KSh2YWx1ZXMsIDApO1xufVxuIiwiaW1wb3J0IHsgc2luZ2xlT3JBcnJheSB9IGZyb20gJy4vaGVscGVycy9zaW5nbGVPckFycmF5LmpzJztcblxuZnVuY3Rpb24gc3VtbWFyaXplKHN1bW1hcml6ZVNwZWMsIG9wdGlvbnMpIHtcbiAgY29uc3QgX3N1bW1hcml6ZSA9IChpdGVtcykgPT4ge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zICE9IG51bGwgPyBvcHRpb25zIDoge307XG4gICAgY29uc3Qgc3VtbWFyaXplZCA9IHt9O1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhzdW1tYXJpemVTcGVjKTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICBzdW1tYXJpemVkW2tleV0gPSBzdW1tYXJpemVTcGVjW2tleV0oaXRlbXMpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5yZXN0ICYmIGl0ZW1zLmxlbmd0aCkge1xuICAgICAgY29uc3Qgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzKGl0ZW1zWzBdKTtcbiAgICAgIGZvciAoY29uc3Qgb2JqS2V5IG9mIG9iamVjdEtleXMpIHtcbiAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMob2JqS2V5KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHN1bW1hcml6ZWRbb2JqS2V5XSA9IG9wdGlvbnMucmVzdChvYmpLZXkpKGl0ZW1zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtzdW1tYXJpemVkXTtcbiAgfTtcbiAgcmV0dXJuIF9zdW1tYXJpemU7XG59XG5mdW5jdGlvbiBfc3VtbWFyaXplSGVscGVyKGl0ZW1zLCBzdW1tYXJ5Rm4sIHByZWRpY2F0ZUZuLCBrZXlzKSB7XG4gIGlmICghaXRlbXMubGVuZ3RoKVxuICAgIHJldHVybiBbXTtcbiAgY29uc3Qgc3VtbWFyaXplZCA9IHt9O1xuICBsZXQga2V5c0FycjtcbiAgaWYgKGtleXMgPT0gbnVsbCkge1xuICAgIGtleXNBcnIgPSBPYmplY3Qua2V5cyhpdGVtc1swXSk7XG4gIH0gZWxzZSB7XG4gICAga2V5c0FyciA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5SW5wdXQgb2Ygc2luZ2xlT3JBcnJheShrZXlzKSkge1xuICAgICAgaWYgKHR5cGVvZiBrZXlJbnB1dCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGtleXNBcnIucHVzaCguLi5rZXlJbnB1dChpdGVtcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAga2V5c0Fyci5wdXNoKGtleUlucHV0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0Fycikge1xuICAgIGlmIChwcmVkaWNhdGVGbikge1xuICAgICAgY29uc3QgdmVjdG9yID0gaXRlbXMubWFwKChkKSA9PiBkW2tleV0pO1xuICAgICAgaWYgKCFwcmVkaWNhdGVGbih2ZWN0b3IpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBzdW1tYXJpemVkW2tleV0gPSBzdW1tYXJ5Rm4oa2V5KShpdGVtcyk7XG4gIH1cbiAgcmV0dXJuIFtzdW1tYXJpemVkXTtcbn1cbmZ1bmN0aW9uIHN1bW1hcml6ZUFsbChzdW1tYXJ5Rm4pIHtcbiAgY29uc3QgX3N1bW1hcml6ZUFsbCA9IChpdGVtcykgPT4gX3N1bW1hcml6ZUhlbHBlcihpdGVtcywgc3VtbWFyeUZuKTtcbiAgcmV0dXJuIF9zdW1tYXJpemVBbGw7XG59XG5mdW5jdGlvbiBzdW1tYXJpemVJZihwcmVkaWNhdGVGbiwgc3VtbWFyeUZuKSB7XG4gIGNvbnN0IF9zdW1tYXJpemVJZiA9IChpdGVtcykgPT4gX3N1bW1hcml6ZUhlbHBlcihpdGVtcywgc3VtbWFyeUZuLCBwcmVkaWNhdGVGbik7XG4gIHJldHVybiBfc3VtbWFyaXplSWY7XG59XG5mdW5jdGlvbiBzdW1tYXJpemVBdChrZXlzLCBzdW1tYXJ5Rm4pIHtcbiAgY29uc3QgX3N1bW1hcml6ZUF0ID0gKGl0ZW1zKSA9PiBfc3VtbWFyaXplSGVscGVyKGl0ZW1zLCBzdW1tYXJ5Rm4sIHZvaWQgMCwga2V5cyk7XG4gIHJldHVybiBfc3VtbWFyaXplQXQ7XG59XG5cbmV4cG9ydCB7IHN1bW1hcml6ZSwgc3VtbWFyaXplQWxsLCBzdW1tYXJpemVBdCwgc3VtbWFyaXplSWYgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN1bW1hcml6ZS5qcy5tYXBcbiIsImZ1bmN0aW9uIG11dGF0ZShtdXRhdGVTcGVjKSB7XG4gIGNvbnN0IF9tdXRhdGUgPSAoaXRlbXMpID0+IHtcbiAgICBjb25zdCBtdXRhdGVkSXRlbXMgPSBpdGVtcy5tYXAoKGQpID0+ICh7Li4uZH0pKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBtdXRhdGVkSXRlbSBvZiBtdXRhdGVkSXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3Qga2V5IGluIG11dGF0ZVNwZWMpIHtcbiAgICAgICAgY29uc3QgbXV0YXRlU3BlY1ZhbHVlID0gbXV0YXRlU3BlY1trZXldO1xuICAgICAgICBjb25zdCBtdXRhdGVkUmVzdWx0ID0gdHlwZW9mIG11dGF0ZVNwZWNWYWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gbXV0YXRlU3BlY1ZhbHVlKG11dGF0ZWRJdGVtLCBpLCBtdXRhdGVkSXRlbXMpIDogbXV0YXRlU3BlY1ZhbHVlO1xuICAgICAgICBtdXRhdGVkSXRlbVtrZXldID0gbXV0YXRlZFJlc3VsdDtcbiAgICAgIH1cbiAgICAgICsraTtcbiAgICB9XG4gICAgcmV0dXJuIG11dGF0ZWRJdGVtcztcbiAgfTtcbiAgcmV0dXJuIF9tdXRhdGU7XG59XG5cbmV4cG9ydCB7IG11dGF0ZSB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bXV0YXRlLmpzLm1hcFxuIiwiZnVuY3Rpb24gYXNzaWduR3JvdXBLZXlzKGQsIGtleXMpIHtcbiAgaWYgKGQgPT0gbnVsbCB8fCB0eXBlb2YgZCAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KGQpKVxuICAgIHJldHVybiBkO1xuICBjb25zdCBrZXlzT2JqID0gT2JqZWN0LmZyb21FbnRyaWVzKGtleXMuZmlsdGVyKChrZXkpID0+IHR5cGVvZiBrZXlbMF0gIT09IFwiZnVuY3Rpb25cIiAmJiBrZXlbMF0gIT0gbnVsbCkpO1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihrZXlzT2JqLCBkKTtcbn1cblxuZXhwb3J0IHsgYXNzaWduR3JvdXBLZXlzIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1hc3NpZ25Hcm91cEtleXMuanMubWFwXG4iLCJmdW5jdGlvbiBncm91cFRyYXZlcnNhbChncm91cGVkLCBvdXRwdXRHcm91cGVkLCBrZXlzLCBhZGRTdWJncm91cCwgYWRkTGVhdmVzLCBsZXZlbCA9IDApIHtcbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgZ3JvdXBlZC5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCBrZXlzSGVyZSA9IFsuLi5rZXlzLCBrZXldO1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgY29uc3Qgc3ViZ3JvdXAgPSBhZGRTdWJncm91cChvdXRwdXRHcm91cGVkLCBrZXlzSGVyZSwgbGV2ZWwpO1xuICAgICAgZ3JvdXBUcmF2ZXJzYWwodmFsdWUsIHN1Ymdyb3VwLCBrZXlzSGVyZSwgYWRkU3ViZ3JvdXAsIGFkZExlYXZlcywgbGV2ZWwgKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWRkTGVhdmVzKG91dHB1dEdyb3VwZWQsIGtleXNIZXJlLCB2YWx1ZSwgbGV2ZWwpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0cHV0R3JvdXBlZDtcbn1cblxuZXhwb3J0IHsgZ3JvdXBUcmF2ZXJzYWwgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWdyb3VwVHJhdmVyc2FsLmpzLm1hcFxuIiwiaW1wb3J0IHsgZ3JvdXBUcmF2ZXJzYWwgfSBmcm9tICcuL2dyb3VwVHJhdmVyc2FsLmpzJztcblxuZnVuY3Rpb24gZ3JvdXBNYXAoZ3JvdXBlZCwgZ3JvdXBGbiwga2V5Rm4gPSAoa2V5cykgPT4ga2V5c1trZXlzLmxlbmd0aCAtIDFdKSB7XG4gIGZ1bmN0aW9uIGFkZFN1Ymdyb3VwKHBhcmVudEdyb3VwZWQsIGtleXMpIHtcbiAgICBjb25zdCBzdWJncm91cCA9IG5ldyBNYXAoKTtcbiAgICBwYXJlbnRHcm91cGVkLnNldChrZXlGbihrZXlzKSwgc3ViZ3JvdXApO1xuICAgIHJldHVybiBzdWJncm91cDtcbiAgfVxuICBmdW5jdGlvbiBhZGRMZWF2ZXMocGFyZW50R3JvdXBlZCwga2V5cywgdmFsdWVzKSB7XG4gICAgcGFyZW50R3JvdXBlZC5zZXQoa2V5Rm4oa2V5cyksIGdyb3VwRm4odmFsdWVzLCBrZXlzKSk7XG4gIH1cbiAgY29uc3Qgb3V0cHV0R3JvdXBlZCA9IG5ldyBNYXAoKTtcbiAgZ3JvdXBUcmF2ZXJzYWwoZ3JvdXBlZCwgb3V0cHV0R3JvdXBlZCwgW10sIGFkZFN1Ymdyb3VwLCBhZGRMZWF2ZXMpO1xuICByZXR1cm4gb3V0cHV0R3JvdXBlZDtcbn1cblxuZXhwb3J0IHsgZ3JvdXBNYXAgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWdyb3VwTWFwLmpzLm1hcFxuIiwiY29uc3QgaWRlbnRpdHkgPSAoZCkgPT4gZDtcblxuZXhwb3J0IHsgaWRlbnRpdHkgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlkZW50aXR5LmpzLm1hcFxuIiwiZnVuY3Rpb24gaXNPYmplY3Qob2JqKSB7XG4gIGNvbnN0IHR5cGUgPSB0eXBlb2Ygb2JqO1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKHR5cGUgPT09IFwib2JqZWN0XCIgfHwgdHlwZSA9PT0gXCJmdW5jdGlvblwiKTtcbn1cblxuZXhwb3J0IHsgaXNPYmplY3QgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzT2JqZWN0LmpzLm1hcFxuIiwiaW1wb3J0IHsgZ3JvdXAgfSBmcm9tICdkMy1hcnJheSc7XG5pbXBvcnQgeyBhc3NpZ25Hcm91cEtleXMgfSBmcm9tICcuL2hlbHBlcnMvYXNzaWduR3JvdXBLZXlzLmpzJztcbmltcG9ydCB7IGdyb3VwTWFwIH0gZnJvbSAnLi9oZWxwZXJzL2dyb3VwTWFwLmpzJztcbmltcG9ydCB7IGdyb3VwVHJhdmVyc2FsIH0gZnJvbSAnLi9oZWxwZXJzL2dyb3VwVHJhdmVyc2FsLmpzJztcbmltcG9ydCB7IGlkZW50aXR5IH0gZnJvbSAnLi9oZWxwZXJzL2lkZW50aXR5LmpzJztcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSAnLi9oZWxwZXJzL2lzT2JqZWN0LmpzJztcbmltcG9ydCB7IHNpbmdsZU9yQXJyYXkgfSBmcm9tICcuL2hlbHBlcnMvc2luZ2xlT3JBcnJheS5qcyc7XG5cbmZ1bmN0aW9uIGdyb3VwQnkoZ3JvdXBLZXlzLCBmbnMsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBmbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGZucyA9IFtmbnNdO1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgZm5zICE9IG51bGwgJiYgIUFycmF5LmlzQXJyYXkoZm5zKSkge1xuICAgIG9wdGlvbnMgPSBmbnM7XG4gIH1cbiAgY29uc3QgX2dyb3VwQnkgPSAoaXRlbXMpID0+IHtcbiAgICBjb25zdCBncm91cGVkID0gbWFrZUdyb3VwZWQoaXRlbXMsIGdyb3VwS2V5cyk7XG4gICAgY29uc3QgcmVzdWx0cyA9IHJ1bkZsb3coZ3JvdXBlZCwgZm5zLCBvcHRpb25zID09IG51bGwgPyB2b2lkIDAgOiBvcHRpb25zLmFkZEdyb3VwS2V5cyk7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCA/IHZvaWQgMCA6IG9wdGlvbnMuZXhwb3J0KSB7XG4gICAgICBzd2l0Y2ggKG9wdGlvbnMuZXhwb3J0KSB7XG4gICAgICAgIGNhc2UgXCJncm91cGVkXCI6XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgIGNhc2UgXCJsZXZlbHNcIjpcbiAgICAgICAgICByZXR1cm4gZXhwb3J0TGV2ZWxzKHJlc3VsdHMsIG9wdGlvbnMpO1xuICAgICAgICBjYXNlIFwiZW50cmllcy1vYmpcIjpcbiAgICAgICAgY2FzZSBcImVudHJpZXNPYmplY3RcIjpcbiAgICAgICAgICByZXR1cm4gZXhwb3J0TGV2ZWxzKHJlc3VsdHMsIHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBleHBvcnQ6IFwibGV2ZWxzXCIsXG4gICAgICAgICAgICBsZXZlbHM6IFtcImVudHJpZXMtb2JqZWN0XCJdXG4gICAgICAgICAgfSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIGV4cG9ydExldmVscyhyZXN1bHRzLCB7XG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgZXhwb3J0OiBcImxldmVsc1wiLFxuICAgICAgICAgICAgbGV2ZWxzOiBbb3B0aW9ucy5leHBvcnRdXG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHVuZ3JvdXBlZCA9IHVuZ3JvdXAocmVzdWx0cywgb3B0aW9ucyA9PSBudWxsID8gdm9pZCAwIDogb3B0aW9ucy5hZGRHcm91cEtleXMpO1xuICAgIHJldHVybiB1bmdyb3VwZWQ7XG4gIH07XG4gIHJldHVybiBfZ3JvdXBCeTtcbn1cbmdyb3VwQnkuZ3JvdXBlZCA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJncm91cGVkXCJ9KTtcbmdyb3VwQnkuZW50cmllcyA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJlbnRyaWVzXCJ9KTtcbmdyb3VwQnkuZW50cmllc09iamVjdCA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJlbnRyaWVzLW9iamVjdFwifSk7XG5ncm91cEJ5Lm9iamVjdCA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJvYmplY3RcIn0pO1xuZ3JvdXBCeS5tYXAgPSAob3B0aW9ucykgPT4gKHsuLi5vcHRpb25zLCBleHBvcnQ6IFwibWFwXCJ9KTtcbmdyb3VwQnkua2V5cyA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJrZXlzXCJ9KTtcbmdyb3VwQnkudmFsdWVzID0gKG9wdGlvbnMpID0+ICh7Li4ub3B0aW9ucywgZXhwb3J0OiBcInZhbHVlc1wifSk7XG5ncm91cEJ5LmxldmVscyA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJsZXZlbHNcIn0pO1xuZnVuY3Rpb24gcnVuRmxvdyhpdGVtcywgZm5zLCBhZGRHcm91cEtleXMpIHtcbiAgbGV0IHJlc3VsdCA9IGl0ZW1zO1xuICBpZiAoIShmbnMgPT0gbnVsbCA/IHZvaWQgMCA6IGZucy5sZW5ndGgpKVxuICAgIHJldHVybiByZXN1bHQ7XG4gIGZvciAoY29uc3QgZm4gb2YgZm5zKSB7XG4gICAgaWYgKCFmbilcbiAgICAgIGNvbnRpbnVlO1xuICAgIHJlc3VsdCA9IGdyb3VwTWFwKHJlc3VsdCwgKGl0ZW1zMiwga2V5cykgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IHtncm91cEtleXM6IGtleXN9O1xuICAgICAgbGV0IGxlYWZJdGVtc01hcHBlZCA9IGZuKGl0ZW1zMiwgY29udGV4dCk7XG4gICAgICBpZiAoYWRkR3JvdXBLZXlzICE9PSBmYWxzZSkge1xuICAgICAgICBsZWFmSXRlbXNNYXBwZWQgPSBsZWFmSXRlbXNNYXBwZWQubWFwKChpdGVtKSA9PiBhc3NpZ25Hcm91cEtleXMoaXRlbSwga2V5cykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlYWZJdGVtc01hcHBlZDtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gbWFrZUdyb3VwZWQoaXRlbXMsIGdyb3VwS2V5cykge1xuICBjb25zdCBncm91cEtleUZucyA9IHNpbmdsZU9yQXJyYXkoZ3JvdXBLZXlzKS5tYXAoKGtleSwgaSkgPT4ge1xuICAgIGNvbnN0IGtleUZuID0gdHlwZW9mIGtleSA9PT0gXCJmdW5jdGlvblwiID8ga2V5IDogKGQpID0+IGRba2V5XTtcbiAgICBjb25zdCBrZXlDYWNoZSA9IG5ldyBNYXAoKTtcbiAgICByZXR1cm4gKGQpID0+IHtcbiAgICAgIGNvbnN0IGtleVZhbHVlID0ga2V5Rm4oZCk7XG4gICAgICBjb25zdCBrZXlWYWx1ZU9mID0gaXNPYmplY3Qoa2V5VmFsdWUpID8ga2V5VmFsdWUudmFsdWVPZigpIDoga2V5VmFsdWU7XG4gICAgICBpZiAoa2V5Q2FjaGUuaGFzKGtleVZhbHVlT2YpKSB7XG4gICAgICAgIHJldHVybiBrZXlDYWNoZS5nZXQoa2V5VmFsdWVPZik7XG4gICAgICB9XG4gICAgICBjb25zdCBrZXlXaXRoTmFtZSA9IFtrZXksIGtleVZhbHVlXTtcbiAgICAgIGtleUNhY2hlLnNldChrZXlWYWx1ZU9mLCBrZXlXaXRoTmFtZSk7XG4gICAgICByZXR1cm4ga2V5V2l0aE5hbWU7XG4gICAgfTtcbiAgfSk7XG4gIGNvbnN0IGdyb3VwZWQgPSBncm91cChpdGVtcywgLi4uZ3JvdXBLZXlGbnMpO1xuICByZXR1cm4gZ3JvdXBlZDtcbn1cbmZ1bmN0aW9uIHVuZ3JvdXAoZ3JvdXBlZCwgYWRkR3JvdXBLZXlzKSB7XG4gIGNvbnN0IGl0ZW1zID0gW107XG4gIGdyb3VwVHJhdmVyc2FsKGdyb3VwZWQsIGl0ZW1zLCBbXSwgaWRlbnRpdHksIChyb290LCBrZXlzLCB2YWx1ZXMpID0+IHtcbiAgICBsZXQgdmFsdWVzVG9BZGQgPSB2YWx1ZXM7XG4gICAgaWYgKGFkZEdyb3VwS2V5cyAhPT0gZmFsc2UpIHtcbiAgICAgIHZhbHVlc1RvQWRkID0gdmFsdWVzLm1hcCgoZCkgPT4gYXNzaWduR3JvdXBLZXlzKGQsIGtleXMpKTtcbiAgICB9XG4gICAgcm9vdC5wdXNoKC4uLnZhbHVlc1RvQWRkKTtcbiAgfSk7XG4gIHJldHVybiBpdGVtcztcbn1cbmNvbnN0IGRlZmF1bHRDb21wb3NpdGVLZXkgPSAoa2V5cykgPT4ga2V5cy5qb2luKFwiL1wiKTtcbmZ1bmN0aW9uIHByb2Nlc3NGcm9tR3JvdXBzT3B0aW9ucyhvcHRpb25zKSB7XG4gIHZhciBfYTtcbiAgY29uc3Qge1xuICAgIGZsYXQsXG4gICAgc2luZ2xlLFxuICAgIG1hcExlYWYgPSBpZGVudGl0eSxcbiAgICBtYXBMZWF2ZXMgPSBpZGVudGl0eSxcbiAgICBhZGRHcm91cEtleXNcbiAgfSA9IG9wdGlvbnM7XG4gIGxldCBjb21wb3NpdGVLZXk7XG4gIGlmIChvcHRpb25zLmZsYXQpIHtcbiAgICBjb21wb3NpdGVLZXkgPSAoX2EgPSBvcHRpb25zLmNvbXBvc2l0ZUtleSkgIT0gbnVsbCA/IF9hIDogZGVmYXVsdENvbXBvc2l0ZUtleTtcbiAgfVxuICBjb25zdCBncm91cEZuID0gKHZhbHVlcywga2V5cykgPT4ge1xuICAgIHJldHVybiBzaW5nbGUgPyBtYXBMZWFmKGFkZEdyb3VwS2V5cyA9PT0gZmFsc2UgPyB2YWx1ZXNbMF0gOiBhc3NpZ25Hcm91cEtleXModmFsdWVzWzBdLCBrZXlzKSkgOiBtYXBMZWF2ZXModmFsdWVzLm1hcCgoZCkgPT4gbWFwTGVhZihhZGRHcm91cEtleXMgPT09IGZhbHNlID8gZCA6IGFzc2lnbkdyb3VwS2V5cyhkLCBrZXlzKSkpKTtcbiAgfTtcbiAgY29uc3Qga2V5Rm4gPSBmbGF0ID8gKGtleXMpID0+IGNvbXBvc2l0ZUtleShrZXlzLm1hcCgoZCkgPT4gZFsxXSkpIDogKGtleXMpID0+IGtleXNba2V5cy5sZW5ndGggLSAxXVsxXTtcbiAgcmV0dXJuIHtncm91cEZuLCBrZXlGbn07XG59XG5mdW5jdGlvbiBleHBvcnRMZXZlbHMoZ3JvdXBlZCwgb3B0aW9ucykge1xuICBjb25zdCB7Z3JvdXBGbiwga2V5Rm59ID0gcHJvY2Vzc0Zyb21Hcm91cHNPcHRpb25zKG9wdGlvbnMpO1xuICBsZXQge21hcEVudHJ5ID0gaWRlbnRpdHl9ID0gb3B0aW9ucztcbiAgY29uc3Qge2xldmVscyA9IFtcImVudHJpZXNcIl19ID0gb3B0aW9ucztcbiAgY29uc3QgbGV2ZWxTcGVjcyA9IFtdO1xuICBmb3IgKGNvbnN0IGxldmVsT3B0aW9uIG9mIGxldmVscykge1xuICAgIHN3aXRjaCAobGV2ZWxPcHRpb24pIHtcbiAgICAgIGNhc2UgXCJlbnRyaWVzXCI6XG4gICAgICBjYXNlIFwiZW50cmllcy1vYmplY3RcIjpcbiAgICAgIGNhc2UgXCJlbnRyaWVzLW9ialwiOlxuICAgICAgY2FzZSBcImVudHJpZXNPYmplY3RcIjoge1xuICAgICAgICBjb25zdCBsZXZlbE1hcEVudHJ5ID0gKGxldmVsT3B0aW9uID09PSBcImVudHJpZXMtb2JqZWN0XCIgfHwgbGV2ZWxPcHRpb24gPT09IFwiZW50cmllcy1vYmpcIiB8fCBsZXZlbE9wdGlvbiA9PT0gXCJlbnRyaWVzT2JqZWN0XCIpICYmIG9wdGlvbnMubWFwRW50cnkgPT0gbnVsbCA/IChba2V5LCB2YWx1ZXNdKSA9PiAoe2tleSwgdmFsdWVzfSkgOiBtYXBFbnRyeTtcbiAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKHtcbiAgICAgICAgICBpZDogXCJlbnRyaWVzXCIsXG4gICAgICAgICAgY3JlYXRlRW1wdHlTdWJncm91cDogKCkgPT4gW10sXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5LCBsZXZlbCkgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZC5wdXNoKGxldmVsTWFwRW50cnkoW2tleSwgbmV3U3ViZ3JvdXBdLCBsZXZlbCkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYWRkTGVhZjogKHBhcmVudEdyb3VwZWQsIGtleSwgdmFsdWVzLCBsZXZlbCkgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZC5wdXNoKGxldmVsTWFwRW50cnkoW2tleSwgdmFsdWVzXSwgbGV2ZWwpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJtYXBcIjpcbiAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKHtcbiAgICAgICAgICBpZDogXCJtYXBcIixcbiAgICAgICAgICBjcmVhdGVFbXB0eVN1Ymdyb3VwOiAoKSA9PiBuZXcgTWFwKCksXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5KSA9PiB7XG4gICAgICAgICAgICBwYXJlbnRHcm91cGVkLnNldChrZXksIG5ld1N1Ymdyb3VwKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFkZExlYWY6IChwYXJlbnRHcm91cGVkLCBrZXksIHZhbHVlcykgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZC5zZXQoa2V5LCB2YWx1ZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgICBsZXZlbFNwZWNzLnB1c2goe1xuICAgICAgICAgIGlkOiBcIm9iamVjdFwiLFxuICAgICAgICAgIGNyZWF0ZUVtcHR5U3ViZ3JvdXA6ICgpID0+ICh7fSksXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5KSA9PiB7XG4gICAgICAgICAgICBwYXJlbnRHcm91cGVkW2tleV0gPSBuZXdTdWJncm91cDtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFkZExlYWY6IChwYXJlbnRHcm91cGVkLCBrZXksIHZhbHVlcykgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZFtrZXldID0gdmFsdWVzO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImtleXNcIjpcbiAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKHtcbiAgICAgICAgICBpZDogXCJrZXlzXCIsXG4gICAgICAgICAgY3JlYXRlRW1wdHlTdWJncm91cDogKCkgPT4gW10sXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5KSA9PiB7XG4gICAgICAgICAgICBwYXJlbnRHcm91cGVkLnB1c2goW2tleSwgbmV3U3ViZ3JvdXBdKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFkZExlYWY6IChwYXJlbnRHcm91cGVkLCBrZXkpID0+IHtcbiAgICAgICAgICAgIHBhcmVudEdyb3VwZWQucHVzaChrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInZhbHVlc1wiOlxuICAgICAgICBsZXZlbFNwZWNzLnB1c2goe1xuICAgICAgICAgIGlkOiBcInZhbHVlc1wiLFxuICAgICAgICAgIGNyZWF0ZUVtcHR5U3ViZ3JvdXA6ICgpID0+IFtdLFxuICAgICAgICAgIGFkZFN1Ymdyb3VwOiAocGFyZW50R3JvdXBlZCwgbmV3U3ViZ3JvdXApID0+IHtcbiAgICAgICAgICAgIHBhcmVudEdyb3VwZWQucHVzaChuZXdTdWJncm91cCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBhZGRMZWFmOiAocGFyZW50R3JvdXBlZCwga2V5LCB2YWx1ZXMpID0+IHtcbiAgICAgICAgICAgIHBhcmVudEdyb3VwZWQucHVzaCh2YWx1ZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAodHlwZW9mIGxldmVsT3B0aW9uID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKGxldmVsT3B0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCBhZGRTdWJncm91cCA9IChwYXJlbnRHcm91cGVkLCBrZXlzLCBsZXZlbCkgPT4ge1xuICAgIHZhciBfYSwgX2I7XG4gICAgaWYgKG9wdGlvbnMuZmxhdCkge1xuICAgICAgcmV0dXJuIHBhcmVudEdyb3VwZWQ7XG4gICAgfVxuICAgIGNvbnN0IGxldmVsU3BlYyA9IChfYSA9IGxldmVsU3BlY3NbbGV2ZWxdKSAhPSBudWxsID8gX2EgOiBsZXZlbFNwZWNzW2xldmVsU3BlY3MubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgbmV4dExldmVsU3BlYyA9IChfYiA9IGxldmVsU3BlY3NbbGV2ZWwgKyAxXSkgIT0gbnVsbCA/IF9iIDogbGV2ZWxTcGVjO1xuICAgIGNvbnN0IG5ld1N1Ymdyb3VwID0gbmV4dExldmVsU3BlYy5jcmVhdGVFbXB0eVN1Ymdyb3VwKCk7XG4gICAgbGV2ZWxTcGVjLmFkZFN1Ymdyb3VwKHBhcmVudEdyb3VwZWQsIG5ld1N1Ymdyb3VwLCBrZXlGbihrZXlzKSwgbGV2ZWwpO1xuICAgIHJldHVybiBuZXdTdWJncm91cDtcbiAgfTtcbiAgY29uc3QgYWRkTGVhZiA9IChwYXJlbnRHcm91cGVkLCBrZXlzLCB2YWx1ZXMsIGxldmVsKSA9PiB7XG4gICAgdmFyIF9hO1xuICAgIGNvbnN0IGxldmVsU3BlYyA9IChfYSA9IGxldmVsU3BlY3NbbGV2ZWxdKSAhPSBudWxsID8gX2EgOiBsZXZlbFNwZWNzW2xldmVsU3BlY3MubGVuZ3RoIC0gMV07XG4gICAgbGV2ZWxTcGVjLmFkZExlYWYocGFyZW50R3JvdXBlZCwga2V5Rm4oa2V5cyksIGdyb3VwRm4odmFsdWVzLCBrZXlzKSwgbGV2ZWwpO1xuICB9O1xuICBjb25zdCBpbml0aWFsT3V0cHV0T2JqZWN0ID0gbGV2ZWxTcGVjc1swXS5jcmVhdGVFbXB0eVN1Ymdyb3VwKCk7XG4gIHJldHVybiBncm91cFRyYXZlcnNhbChncm91cGVkLCBpbml0aWFsT3V0cHV0T2JqZWN0LCBbXSwgYWRkU3ViZ3JvdXAsIGFkZExlYWYpO1xufVxuXG5leHBvcnQgeyBncm91cEJ5IH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1ncm91cEJ5LmpzLm1hcFxuIiwiaW1wb3J0IHsgZnN1bSB9IGZyb20gJ2QzLWFycmF5JztcblxuZnVuY3Rpb24gc3VtKGtleSwgb3B0aW9ucykge1xuICBsZXQga2V5Rm4gPSB0eXBlb2Yga2V5ID09PSBcImZ1bmN0aW9uXCIgPyBrZXkgOiAoZCkgPT4gZFtrZXldO1xuICBpZiAob3B0aW9ucyA9PSBudWxsID8gdm9pZCAwIDogb3B0aW9ucy5wcmVkaWNhdGUpIHtcbiAgICBjb25zdCBvcmlnaW5hbEtleUZuID0ga2V5Rm47XG4gICAgY29uc3QgcHJlZGljYXRlID0gb3B0aW9ucy5wcmVkaWNhdGU7XG4gICAga2V5Rm4gPSAoZCwgaW5kZXgsIGFycmF5KSA9PiBwcmVkaWNhdGUoZCwgaW5kZXgsIGFycmF5KSA/IG9yaWdpbmFsS2V5Rm4oZCwgaW5kZXgsIGFycmF5KSA6IDA7XG4gIH1cbiAgcmV0dXJuIChpdGVtcykgPT4gZnN1bShpdGVtcywga2V5Rm4pO1xufVxuXG5leHBvcnQgeyBzdW0gfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN1bS5qcy5tYXBcbiIsImZ1bmN0aW9uIGF1dG9kZXRlY3RCeU1hcChpdGVtc0EsIGl0ZW1zQikge1xuICBpZiAoaXRlbXNBLmxlbmd0aCA9PT0gMCB8fCBpdGVtc0IubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiB7fTtcbiAgY29uc3Qga2V5c0EgPSBPYmplY3Qua2V5cyhpdGVtc0FbMF0pO1xuICBjb25zdCBrZXlzQiA9IE9iamVjdC5rZXlzKGl0ZW1zQlswXSk7XG4gIGNvbnN0IGJ5TWFwID0ge307XG4gIGZvciAoY29uc3Qga2V5IG9mIGtleXNBKSB7XG4gICAgaWYgKGtleXNCLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgIGJ5TWFwW2tleV0gPSBrZXk7XG4gICAgfVxuICB9XG4gIHJldHVybiBieU1hcDtcbn1cbmZ1bmN0aW9uIG1ha2VCeU1hcChieSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShieSkpIHtcbiAgICBjb25zdCBieU1hcCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIGJ5KSB7XG4gICAgICBieU1hcFtrZXldID0ga2V5O1xuICAgIH1cbiAgICByZXR1cm4gYnlNYXA7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGJ5ID09PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIGJ5O1xuICB9XG4gIHJldHVybiB7W2J5XTogYnl9O1xufVxuZnVuY3Rpb24gaXNNYXRjaChkLCBqLCBieU1hcCkge1xuICBmb3IgKGNvbnN0IGpLZXkgaW4gYnlNYXApIHtcbiAgICBjb25zdCBkS2V5ID0gYnlNYXBbaktleV07XG4gICAgaWYgKGRbZEtleV0gIT09IGpbaktleV0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5mdW5jdGlvbiBpbm5lckpvaW4oaXRlbXNUb0pvaW4sIG9wdGlvbnMpIHtcbiAgY29uc3QgX2lubmVySm9pbiA9IChpdGVtcykgPT4ge1xuICAgIGNvbnN0IGJ5TWFwID0gKG9wdGlvbnMgPT0gbnVsbCA/IHZvaWQgMCA6IG9wdGlvbnMuYnkpID09IG51bGwgPyBhdXRvZGV0ZWN0QnlNYXAoaXRlbXMsIGl0ZW1zVG9Kb2luKSA6IG1ha2VCeU1hcChvcHRpb25zLmJ5KTtcbiAgICBjb25zdCBqb2luZWQgPSBpdGVtcy5mbGF0TWFwKChkKSA9PiB7XG4gICAgICBjb25zdCBtYXRjaGVzID0gaXRlbXNUb0pvaW4uZmlsdGVyKChqKSA9PiBpc01hdGNoKGQsIGosIGJ5TWFwKSk7XG4gICAgICByZXR1cm4gbWF0Y2hlcy5tYXAoKGopID0+ICh7Li4uZCwgLi4uan0pKTtcbiAgICB9KTtcbiAgICByZXR1cm4gam9pbmVkO1xuICB9O1xuICByZXR1cm4gX2lubmVySm9pbjtcbn1cblxuZXhwb3J0IHsgYXV0b2RldGVjdEJ5TWFwLCBpbm5lckpvaW4sIGlzTWF0Y2gsIG1ha2VCeU1hcCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5uZXJKb2luLmpzLm1hcFxuIiwiaW1wb3J0IHsgYXV0b2RldGVjdEJ5TWFwLCBtYWtlQnlNYXAsIGlzTWF0Y2ggfSBmcm9tICcuL2lubmVySm9pbi5qcyc7XG5cbmZ1bmN0aW9uIGxlZnRKb2luKGl0ZW1zVG9Kb2luLCBvcHRpb25zKSB7XG4gIGNvbnN0IF9sZWZ0Sm9pbiA9IChpdGVtcykgPT4ge1xuICAgIGlmICghaXRlbXNUb0pvaW4ubGVuZ3RoKVxuICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIGNvbnN0IGJ5TWFwID0gKG9wdGlvbnMgPT0gbnVsbCA/IHZvaWQgMCA6IG9wdGlvbnMuYnkpID09IG51bGwgPyBhdXRvZGV0ZWN0QnlNYXAoaXRlbXMsIGl0ZW1zVG9Kb2luKSA6IG1ha2VCeU1hcChvcHRpb25zLmJ5KTtcbiAgICBjb25zdCBqb2luT2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzKGl0ZW1zVG9Kb2luWzBdKTtcbiAgICBjb25zdCBqb2luZWQgPSBpdGVtcy5mbGF0TWFwKChkKSA9PiB7XG4gICAgICBjb25zdCBtYXRjaGVzID0gaXRlbXNUb0pvaW4uZmlsdGVyKChqKSA9PiBpc01hdGNoKGQsIGosIGJ5TWFwKSk7XG4gICAgICBpZiAobWF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoZXMubWFwKChqKSA9PiAoey4uLmQsIC4uLmp9KSk7XG4gICAgICB9XG4gICAgICBjb25zdCB1bmRlZmluZWRGaWxsID0gT2JqZWN0LmZyb21FbnRyaWVzKGpvaW5PYmplY3RLZXlzLmZpbHRlcigoa2V5KSA9PiBkW2tleV0gPT0gbnVsbCkubWFwKChrZXkpID0+IFtrZXksIHZvaWQgMF0pKTtcbiAgICAgIHJldHVybiB7Li4uZCwgLi4udW5kZWZpbmVkRmlsbH07XG4gICAgfSk7XG4gICAgcmV0dXJuIGpvaW5lZDtcbiAgfTtcbiAgcmV0dXJuIF9sZWZ0Sm9pbjtcbn1cblxuZXhwb3J0IHsgbGVmdEpvaW4gfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxlZnRKb2luLmpzLm1hcFxuIiwiZnVuY3Rpb24ga2V5c0Zyb21JdGVtcyhpdGVtcykge1xuICBpZiAoaXRlbXMubGVuZ3RoIDwgMSlcbiAgICByZXR1cm4gW107XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhpdGVtc1swXSk7XG4gIHJldHVybiBrZXlzO1xufVxuXG5leHBvcnQgeyBrZXlzRnJvbUl0ZW1zIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1rZXlzRnJvbUl0ZW1zLmpzLm1hcFxuIiwiaW1wb3J0IHsga2V5c0Zyb21JdGVtcyB9IGZyb20gJy4uL2hlbHBlcnMva2V5c0Zyb21JdGVtcy5qcyc7XG5cbmZ1bmN0aW9uIGV2ZXJ5dGhpbmcoKSB7XG4gIHJldHVybiAoaXRlbXMpID0+IHtcbiAgICBjb25zdCBrZXlzID0ga2V5c0Zyb21JdGVtcyhpdGVtcyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG59XG5cbmV4cG9ydCB7IGV2ZXJ5dGhpbmcgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWV2ZXJ5dGhpbmcuanMubWFwXG4iLCJpbXBvcnQgeyBzaW5nbGVPckFycmF5IH0gZnJvbSAnLi9oZWxwZXJzL3NpbmdsZU9yQXJyYXkuanMnO1xuaW1wb3J0IHsgZXZlcnl0aGluZyB9IGZyb20gJy4vc2VsZWN0b3JzL2V2ZXJ5dGhpbmcuanMnO1xuXG5mdW5jdGlvbiBwcm9jZXNzU2VsZWN0b3JzKGl0ZW1zLCBzZWxlY3RLZXlzKSB7XG4gIGxldCBwcm9jZXNzZWRTZWxlY3RLZXlzID0gW107XG4gIGZvciAoY29uc3Qga2V5SW5wdXQgb2Ygc2luZ2xlT3JBcnJheShzZWxlY3RLZXlzKSkge1xuICAgIGlmICh0eXBlb2Yga2V5SW5wdXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcHJvY2Vzc2VkU2VsZWN0S2V5cy5wdXNoKC4uLmtleUlucHV0KGl0ZW1zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2Nlc3NlZFNlbGVjdEtleXMucHVzaChrZXlJbnB1dCk7XG4gICAgfVxuICB9XG4gIGlmIChwcm9jZXNzZWRTZWxlY3RLZXlzLmxlbmd0aCAmJiBwcm9jZXNzZWRTZWxlY3RLZXlzWzBdWzBdID09PSBcIi1cIikge1xuICAgIHByb2Nlc3NlZFNlbGVjdEtleXMgPSBbLi4uZXZlcnl0aGluZygpKGl0ZW1zKSwgLi4ucHJvY2Vzc2VkU2VsZWN0S2V5c107XG4gIH1cbiAgY29uc3QgbmVnYXRpb25NYXAgPSB7fTtcbiAgY29uc3Qga2V5c1dpdGhvdXROZWdhdGlvbnMgPSBbXTtcbiAgZm9yIChsZXQgayA9IHByb2Nlc3NlZFNlbGVjdEtleXMubGVuZ3RoIC0gMTsgayA+PSAwOyBrLS0pIHtcbiAgICBjb25zdCBrZXkgPSBwcm9jZXNzZWRTZWxlY3RLZXlzW2tdO1xuICAgIGlmIChrZXlbMF0gPT09IFwiLVwiKSB7XG4gICAgICBuZWdhdGlvbk1hcFtrZXkuc3Vic3RyaW5nKDEpXSA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKG5lZ2F0aW9uTWFwW2tleV0pIHtcbiAgICAgIG5lZ2F0aW9uTWFwW2tleV0gPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBrZXlzV2l0aG91dE5lZ2F0aW9ucy51bnNoaWZ0KGtleSk7XG4gIH1cbiAgcHJvY2Vzc2VkU2VsZWN0S2V5cyA9IEFycmF5LmZyb20obmV3IFNldChrZXlzV2l0aG91dE5lZ2F0aW9ucykpO1xuICByZXR1cm4gcHJvY2Vzc2VkU2VsZWN0S2V5cztcbn1cbmZ1bmN0aW9uIHNlbGVjdChzZWxlY3RLZXlzKSB7XG4gIGNvbnN0IF9zZWxlY3QgPSAoaXRlbXMpID0+IHtcbiAgICBsZXQgcHJvY2Vzc2VkU2VsZWN0S2V5cyA9IHByb2Nlc3NTZWxlY3RvcnMoaXRlbXMsIHNlbGVjdEtleXMpO1xuICAgIGlmICghcHJvY2Vzc2VkU2VsZWN0S2V5cy5sZW5ndGgpXG4gICAgICByZXR1cm4gaXRlbXM7XG4gICAgcmV0dXJuIGl0ZW1zLm1hcCgoZCkgPT4ge1xuICAgICAgY29uc3QgbWFwcGVkID0ge307XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBwcm9jZXNzZWRTZWxlY3RLZXlzKSB7XG4gICAgICAgIG1hcHBlZFtrZXldID0gZFtrZXldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hcHBlZDtcbiAgICB9KTtcbiAgfTtcbiAgcmV0dXJuIF9zZWxlY3Q7XG59XG5cbmV4cG9ydCB7IHByb2Nlc3NTZWxlY3RvcnMsIHNlbGVjdCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2VsZWN0LmpzLm1hcFxuIiwiaW1wb3J0IHsgcHJvY2Vzc1NlbGVjdG9ycyB9IGZyb20gJy4vc2VsZWN0LmpzJztcblxuZnVuY3Rpb24gcGl2b3RMb25nZXIob3B0aW9ucykge1xuICBjb25zdCBfcGl2b3RMb25nZXIgPSAoaXRlbXMpID0+IHtcbiAgICB2YXIgX2E7XG4gICAgY29uc3Qge25hbWVzVG8sIHZhbHVlc1RvLCBuYW1lc1NlcCA9IFwiX1wifSA9IG9wdGlvbnM7XG4gICAgY29uc3QgY29scyA9IChfYSA9IG9wdGlvbnMuY29scykgIT0gbnVsbCA/IF9hIDogW107XG4gICAgY29uc3QgY29sc0tleXMgPSBwcm9jZXNzU2VsZWN0b3JzKGl0ZW1zLCBjb2xzKTtcbiAgICBjb25zdCBuYW1lc1RvS2V5cyA9IEFycmF5LmlzQXJyYXkobmFtZXNUbykgPyBuYW1lc1RvIDogW25hbWVzVG9dO1xuICAgIGNvbnN0IHZhbHVlc1RvS2V5cyA9IEFycmF5LmlzQXJyYXkodmFsdWVzVG8pID8gdmFsdWVzVG8gOiBbdmFsdWVzVG9dO1xuICAgIGNvbnN0IGhhc011bHRpcGxlTmFtZXNUbyA9IG5hbWVzVG9LZXlzLmxlbmd0aCA+IDE7XG4gICAgY29uc3QgaGFzTXVsdGlwbGVWYWx1ZXNUbyA9IHZhbHVlc1RvS2V5cy5sZW5ndGggPiAxO1xuICAgIGNvbnN0IGxvbmdlciA9IFtdO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgY29uc3QgcmVtYWluaW5nS2V5cyA9IE9iamVjdC5rZXlzKGl0ZW0pLmZpbHRlcigoa2V5KSA9PiAhY29sc0tleXMuaW5jbHVkZXMoa2V5KSk7XG4gICAgICBjb25zdCBiYXNlT2JqID0ge307XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiByZW1haW5pbmdLZXlzKSB7XG4gICAgICAgIGJhc2VPYmpba2V5XSA9IGl0ZW1ba2V5XTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5hbWVWYWx1ZUtleXNXaXRob3V0VmFsdWVQcmVmaXggPSBoYXNNdWx0aXBsZVZhbHVlc1RvID8gQXJyYXkuZnJvbShuZXcgU2V0KGNvbHNLZXlzLm1hcCgoa2V5KSA9PiBrZXkuc3Vic3RyaW5nKGtleS5pbmRleE9mKG5hbWVzU2VwKSArIDEpKSkpIDogY29sc0tleXM7XG4gICAgICBmb3IgKGNvbnN0IG5hbWVWYWx1ZSBvZiBuYW1lVmFsdWVLZXlzV2l0aG91dFZhbHVlUHJlZml4KSB7XG4gICAgICAgIGNvbnN0IGVudHJ5T2JqID0gey4uLmJhc2VPYmp9O1xuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlS2V5IG9mIHZhbHVlc1RvS2V5cykge1xuICAgICAgICAgIGNvbnN0IGl0ZW1LZXkgPSBoYXNNdWx0aXBsZVZhbHVlc1RvID8gYCR7dmFsdWVLZXl9JHtuYW1lc1NlcH0ke25hbWVWYWx1ZX1gIDogbmFtZVZhbHVlO1xuICAgICAgICAgIGNvbnN0IG5hbWVWYWx1ZVBhcnRzID0gaGFzTXVsdGlwbGVOYW1lc1RvID8gbmFtZVZhbHVlLnNwbGl0KG5hbWVzU2VwKSA6IFtuYW1lVmFsdWVdO1xuICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICBmb3IgKGNvbnN0IG5hbWVLZXkgb2YgbmFtZXNUb0tleXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWVWYWx1ZVBhcnQgPSBuYW1lVmFsdWVQYXJ0c1tpKytdO1xuICAgICAgICAgICAgZW50cnlPYmpbbmFtZUtleV0gPSBuYW1lVmFsdWVQYXJ0O1xuICAgICAgICAgICAgZW50cnlPYmpbdmFsdWVLZXldID0gaXRlbVtpdGVtS2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbG9uZ2VyLnB1c2goZW50cnlPYmopO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9uZ2VyO1xuICB9O1xuICByZXR1cm4gX3Bpdm90TG9uZ2VyO1xufVxuXG5leHBvcnQgeyBwaXZvdExvbmdlciB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cGl2b3RMb25nZXIuanMubWFwXG4iLCJpbXBvcnQge1xuICBBcHBsaWVkUHJvbXB0cyxcbiAgQ29udGV4dCxcbiAgb25EcmlsbERvd25GdW5jdGlvbixcbiAgUmVzcG9uc2VEYXRhLFxuICBUQ29udGV4dFxufSBmcm9tICdAaW5jb3J0YS1vcmcvY29tcG9uZW50LXNkayc7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgdGlkeSwgcGl2b3RMb25nZXIsIG11dGF0ZSxmdWxsSm9pbixsZWZ0Sm9pbiwgZ3JvdXBCeSwgc3VtbWFyaXplLCBzdW0sIGZpbHRlciwgbGFzdCB9IGZyb20gJ0B0aWR5anMvdGlkeSdcbmltcG9ydCAnLi9BcHAuY3NzJztcblxuICBcbmludGVyZmFjZSBQcm9wcyB7XG4gIGNvbnRleHQ6IENvbnRleHQ8VENvbnRleHQ+O1xuICBwcm9tcHRzOiBBcHBsaWVkUHJvbXB0cztcbiAgZGF0YTogUmVzcG9uc2VEYXRhO1xuICBkcmlsbERvd246IG9uRHJpbGxEb3duRnVuY3Rpb247XG59XG5cbmNvbnN0IEZpblN0YXRlbWVudCA9ICh7IGNvbnRleHQsIHByb21wdHMsIGRhdGEsIGRyaWxsRG93biB9OiBQcm9wcykgPT4ge1xuICBjb25zb2xlLmxvZyhkYXRhKVxuICBcbiAgLy8gR2V0cyBkaW1lbnRpb25zIGFuZCBtZWFzdXJlcyBjb2x1bW5zIFxuICBjb25zdCBkaW1zID0gZGF0YS5yb3dIZWFkZXJzPy5tYXAoY2VsbCA9PiB7XG4gICAgcmV0dXJuIHsgZmllbGQ6IGNlbGwuaWQsIGhlYWRlcjogY2VsbC5sYWJlbCwgdHlwZTogJ2RpbWVudGlvbicgfTtcbiAgfSkgPz8gW107XG4gIGNvbnN0IG1hYXN1cmVzID0gZGF0YS5tZWFzdXJlSGVhZGVycy5tYXAoY2VsbCA9PiB7XG4gIHJldHVybiB7IGZpZWxkOiBjZWxsLmlkLCBoZWFkZXI6IGNlbGwubGFiZWwsIHR5cGU6ICdtZWFzdXJlJyB9O1xuICB9KTtcbiAgY29uc3QgY29scyA9IGRpbXMuY29uY2F0KG1hYXN1cmVzKTtcbiAgLy8gb25seSBnZXQgdGhlIGhlYWRlciBuYW1lIFxuICBsZXQgY29sc05hbWUgPSBjb2xzLm1hcChhID0+IGEuaGVhZGVyKTtcbiAgbGV0IG1hYXN1cmVOYW1lID0gbWFhc3VyZXMubWFwKGEgPT4gYS5oZWFkZXIpO1xuXG4gIC8vIGdldCBkYXRhIGZyb20gSW5jb3J0YSBhbmQgcHV0IGludG8gYXJyYXlcbiAgbGV0IF9yYXdEYXRhID0gZGF0YS5kYXRhLm1hcCgoY29sOiBhbnkpID0+IHtcbiAgICBsZXQgY29sc05hbWUgPSBjb2w7XG4gICAgcmV0dXJuIGNvbHNOYW1lfSk7XG4gICAgXG4gIC8vIGFkanVzdCB0aGUga2V5IG5hbWUgd2l0aCBjb2xzTmFtZSBcbiAgbGV0IHJhd19pbnB1dDogYW55W10gPSBbXVxuICBfcmF3RGF0YS5tYXAoZnVuY3Rpb24oZCl7XG4gICAgbGV0IHIgPSB7fVxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBjb2xzTmFtZS5sZW5ndGg7IGkrKyl7IFxuICAgICAgcltjb2xzTmFtZVtpXV0gPSBkW2ldLmZvcm1hdHRlZH1cbiAgICByYXdfaW5wdXQucHVzaChyKSAvLyBhcHBlbmQgYXJyYXlcbiAgICB9KVxuXG4gIHJhd19pbnB1dC5tYXAoZnVuY3Rpb24oZCl7XG4gICAgZC5QZXJpb2QgPSBwYXJzZUZsb2F0KGQuUGVyaW9kKTt9KVxuXG4gIC8vIGdldCBjdXJyZW50IHllYXIgZGVmaW5lZCBpbiBJbmNvcnRhIEluc2lnaHRcbiAgY29uc3QgY3VyciA9IHBhcnNlSW50KGRhdGEuZGF0YVswXS5hdCgzKT8udmFsdWUhKVxuICAvLyBvbmx5IHVzZSAyIHllYXJzIGRhdGEgZm9yIHByb2Nlc3NcbiAgcmF3X2lucHV0ID1yYXdfaW5wdXQuZmlsdGVyKGQgPT4gZC5QZXJpb2QgPT0gY3VyciB8fCBkLlBlcmlvZCA9PSBjdXJyLTEpO1xuICBjb25zb2xlLmxvZyhyYXdfaW5wdXQpXG5cbiAgLy8gdW5waXZpb3QgdGhlIGNvbHVtbiBpbnRvOiBwZXJpb2QsIGl0ZW0sIGFtb3VudCBcbiAgbGV0IGR0ID0gdGlkeShcbiAgICAgIHJhd19pbnB1dCxcbiAgICAgIHBpdm90TG9uZ2VyKHtcbiAgICAgICAgY29sczogbWFhc3VyZU5hbWUsXG4gICAgICAgIG5hbWVzVG86ICdpdGVtJyxcbiAgICAgICAgdmFsdWVzVG86ICdhbW91bnQnLFxuICAgICAgfSlcbiAgICApO1xuICBjb25zb2xlLmxvZyhkdClcblxuICAvLyBjaGFuZ2UgZGF0YSB0eXBlIHRvIGZsb2F0IGZvciBhZ3JlZ2F0aW9uIFxuICBkdC5tYXAoZnVuY3Rpb24oZCl7XG4gICAgZC5QZXJpb2QgPSBwYXJzZUZsb2F0KGQuUGVyaW9kKTtcbiAgICBkLmFtb3VudCA9IHBhcnNlRmxvYXQoZC5hbW91bnQpO30pXG5cbiAgLy8gYWdyZWdhdGlvbiBieSBwZXJpb2QgYW5kIGl0ZW0gXG4gIGxldCBuZXdfZHQgPSB0aWR5KFxuICAgIGR0LFxuICAgIGdyb3VwQnkoWydQZXJpb2QnLCAnaXRlbSddLCBbc3VtbWFyaXplKHsgdG90YWw6IHN1bSgnYW1vdW50JykgfSldKSlcbiAgXG4gIFxuICBsZXQgY3VycmRhdGEgPSB0aWR5KG5ld19kdCwgZmlsdGVyKChkKSA9PiBkLlBlcmlvZCA9PT0gY3VycikpXG4gIGxldCBsYXN0ZGF0YSA9IHRpZHkobmV3X2R0LCBmaWx0ZXIoKGQpID0+IGQuUGVyaW9kID09PSBjdXJyLTEpKVxuICAvLyBjaGFuZ2UgdGhlIGtleSBuYW1lIG9mIGxhc3QgeWVhciBkYXRhXG4gIGxldCBsYXN0eXJkYXRhID0gbGFzdGRhdGEubWFwKCh7XG4gICAgdG90YWw6IHRvdGFsbGFzdCxcbiAgICAuLi5yZXN0fSkgPT4gKHtcbiAgICB0b3RhbGxhc3QsIC4uLnJlc3RcbiAgfSkpO1xuICBcbiAgLy8gbGVmdCBqb2luIHR3byB5ZWFycycgZGF0YSBcbiAgbGV0IHR3b2RhdGEgPSB0aWR5KGN1cnJkYXRhLFxuICAgICAgbGVmdEpvaW4obGFzdHlyZGF0YSwgeyBieTogJ2l0ZW0nIH0pKVxuICBjb25zb2xlLmxvZyhcInR3b1wiKVxuICBjb25zb2xlLmxvZyh0d29kYXRhKVxuICAvLyBhZGQgcGVyY2VudGFnZSBjaGFuZ2UgcmF0ZSBiZXR3ZWVuIHR3byB5ZWFyc1xuICBmdW5jdGlvbiBmb3JtYXRBc1BlcmNlbnQobnVtOm51bWJlcikge1xuICAgICAgcmV0dXJuIGAke01hdGguZmxvb3IobnVtKjEwMCl9JWA7fVxuXG4gIGxldCByYXRpb19kdCA9IHRpZHkodHdvZGF0YSwgbXV0YXRlKHtcbiAgICByYXRlOiAoZDogYW55KSA9PiBmb3JtYXRBc1BlcmNlbnQoKGQudG90YWwgLSBkLnRvdGFsbGFzdCkvZC50b3RhbGxhc3QpLFxuICAgIC8vIG5vbi1udWxsIGFzc2VydGlvbiBvcGVyYXRvciB0byBlbnN1cmUgaXQgaXMgbnVtYmVyIHR5cGVcbiAgICBjdXJyX3JhdGlvOiAoZDogYW55KT0+IGZvcm1hdEFzUGVyY2VudChkLnRvdGFsL3R3b2RhdGEuYXQoMCk/LnRvdGFsISksXG4gICAgbGFzdF9yYXRpbzogKGQ6IGFueSk9PiBmb3JtYXRBc1BlcmNlbnQoZC50b3RhbGxhc3QvdHdvZGF0YS5hdCgwKT8udG90YWxsYXN0ISlcbiAgfSkpXG4gIHJhdGlvX2R0LnBvcCgpXG4gIGNvbnNvbGUubG9nKFwib3V0cHV0XCIpO1xuICBjb25zb2xlLmxvZyhyYXRpb19kdCk7XG4gIFxuXG4gIGNvbnN0IERpc3BsYXlEYXRhPXJhdGlvX2R0Lm1hcChcbiAgICAoaW5mbyk9PntcbiAgICAgICAgcmV0dXJuKFxuICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgIDx0ZD57aW5mby5pdGVtfTwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPntpbmZvLnRvdGFsfTwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPntpbmZvLmN1cnJfcmF0aW99PC90ZD5cbiAgICAgICAgICAgICAgICA8dGQ+e2luZm8udG90YWxsYXN0fTwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPntpbmZvLmxhc3RfcmF0aW99PC90ZD5cbiAgICAgICAgICAgICAgICA8dGQ+e2luZm8ucmF0ZX08L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgKVxuICAgIH1cbiAgKVxuXG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2PjxoMj57Y3Vycn0gSW5jb21lIFN0YXRlbWVudDwvaDI+XG4gICAgXG4gICAgICAgICAgICA8dGFibGUgaWQ9XCJjdXN0b21lcnNcIj5cbiAgICAgICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgICAgIDx0cj5cblxuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIDx0aD5JdGVtPC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoPkN1cnJlbnQgeWVhcjwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDx0aD5DdXJyZW50IHJhdGlvPC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoPkxhc3QgeWVhcjwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDx0aD5MYXN0IHJhdGlvPC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoPlBlcmNlbnRhZ2UgQ2hhbmdlPC90aD5cblxuXG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG5cbiAgICAgICAgICAgICAgICA8L3RoZWFkPlxuXG4gICAgICAgICAgICAgICAgPHRib2R5PiAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHtEaXNwbGF5RGF0YX1cblxuICAgICAgICAgICAgICAgIDwvdGJvZHk+XG5cbiAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgIFxuICAgICAgPC9kaXY+XG4gICAgKTtcbiBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEZpblN0YXRlbWVudDtcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQge1xuICB1c2VDb250ZXh0LFxuICBMb2FkaW5nT3ZlcmxheSxcbiAgRXJyb3JPdmVybGF5LFxuICB1c2VQcm9tcHRzLFxuICB1c2VRdWVyeVxufSBmcm9tICdAaW5jb3J0YS1vcmcvY29tcG9uZW50LXNkayc7XG5pbXBvcnQgRmluU3RhdGVtZW50Q29tcG9uZW50IGZyb20gJy4vRmluU3RhdGVtZW50JztcbmltcG9ydCAnLi9zdHlsZXMubGVzcyc7XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgY29uc3QgeyBwcm9tcHRzLCBkcmlsbERvd24gfSA9IHVzZVByb21wdHMoKTtcbiAgY29uc3QgeyBkYXRhLCBjb250ZXh0LCBpc0xvYWRpbmcsIGlzRXJyb3IsIGVycm9yIH0gPSB1c2VRdWVyeSh1c2VDb250ZXh0KCksIHByb21wdHMpO1xuICByZXR1cm4gKFxuICAgIDxFcnJvck92ZXJsYXkgaXNFcnJvcj17aXNFcnJvcn0gZXJyb3I9e2Vycm9yfT5cbiAgICAgIDxMb2FkaW5nT3ZlcmxheSBpc0xvYWRpbmc9e2lzTG9hZGluZ30gZGF0YT17ZGF0YX0+XG4gICAgICAgIHtjb250ZXh0ICYmIGRhdGEgPyAoXG4gICAgICAgICAgPEZpblN0YXRlbWVudENvbXBvbmVudCBkYXRhPXtkYXRhfSBjb250ZXh0PXtjb250ZXh0fSBwcm9tcHRzPXtwcm9tcHRzfSBkcmlsbERvd249e2RyaWxsRG93bn0gLz5cbiAgICAgICAgKSA6IG51bGx9XG4gICAgICA8L0xvYWRpbmdPdmVybGF5PlxuICAgIDwvRXJyb3JPdmVybGF5PlxuICApO1xufTtcbiJdLCJuYW1lcyI6WyJpbmRleCIsImtleSIsImlkZW50aXR5IiwidmFsdWVzIiwia2V5b2YiLCJncm91cCIsIl9hIiwiY29sc05hbWUiLCJSZWFjdCIsIkZpblN0YXRlbWVudENvbXBvbmVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBLE1BQUk7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGLEtBQUksWUFBTyxrQkFBUCxZQUF3QixDQUFFO0FDVjlCLFdBQVMsS0FBSyxV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
//# sourceURL=render.js
