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
    var _a2, _b;
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
    const raw_input = [];
    _rawData.map(function(d) {
      let r = {};
      for (let i = 0; i < colsName.length; i++) {
        r[colsName[i]] = d[i].formatted;
      }
      raw_input.push(r);
    });
    let dt = tidy(
      raw_input,
      pivotLonger({
        cols: maasureName,
        namesTo: "item",
        valuesTo: "amount"
      })
    );
    dt.map(function(d) {
      d.Period = parseFloat(d.Period);
      d.amount = parseFloat(d.amount);
    });
    let new_dt = tidy(
      dt,
      groupBy(["Period", "item"], [summarize({ total: sum("amount") })])
    );
    let curr = 2022;
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
    console.log("test0222");
    console.log(ratio_dt);
    const DisplayData = ratio_dt.map(
      (info) => {
        return /* @__PURE__ */ React__default["default"].createElement("tr", null, /* @__PURE__ */ React__default["default"].createElement("td", null, info.item), /* @__PURE__ */ React__default["default"].createElement("td", null, info.total), /* @__PURE__ */ React__default["default"].createElement("td", null, info.curr_ratio), /* @__PURE__ */ React__default["default"].createElement("td", null, info.totallast), /* @__PURE__ */ React__default["default"].createElement("td", null, info.last_ratio), /* @__PURE__ */ React__default["default"].createElement("td", null, info.rate));
      }
    );
    return /* @__PURE__ */ React__default["default"].createElement("div", null, /* @__PURE__ */ React__default["default"].createElement("h2", null, "2022 Income Statement"), /* @__PURE__ */ React__default["default"].createElement("table", {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLmpzIiwic291cmNlcyI6WyIuLi8uLi9ub2RlX21vZHVsZXMvQGluY29ydGEtb3JnL2NvbXBvbmVudC1zZGsvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvdGlkeS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9maWx0ZXIuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvaGVscGVycy9zaW5nbGVPckFycmF5LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9mc3VtLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2ludGVybm1hcC9zcmMvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2lkZW50aXR5LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9ncm91cC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9zdW1tYXJpemUuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvbXV0YXRlLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL2hlbHBlcnMvYXNzaWduR3JvdXBLZXlzLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL2hlbHBlcnMvZ3JvdXBUcmF2ZXJzYWwuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvaGVscGVycy9ncm91cE1hcC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9oZWxwZXJzL2lkZW50aXR5LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL2hlbHBlcnMvaXNPYmplY3QuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvZ3JvdXBCeS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9zdW1tYXJ5L3N1bS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9pbm5lckpvaW4uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvbGVmdEpvaW4uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQHRpZHlqcy90aWR5L2Rpc3QvZXMvaGVscGVycy9rZXlzRnJvbUl0ZW1zLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL3NlbGVjdG9ycy9ldmVyeXRoaW5nLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B0aWR5anMvdGlkeS9kaXN0L2VzL3NlbGVjdC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AdGlkeWpzL3RpZHkvZGlzdC9lcy9waXZvdExvbmdlci5qcyIsIi4uLy4uL3NyYy9GaW5TdGF0ZW1lbnQudHN4IiwiLi4vLi4vc3JjL2luZGV4LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQge1xuICB1c2VMb2NhbGUsXG4gIHVzZUNvbnRleHQsXG4gIHVzZVByb21wdHMsXG4gIHVzZVF1ZXJ5QnVpbGRlcixcbiAgdXNlQ3VzdG9tUXVlcnksXG4gIHVzZVF1ZXJ5LFxuICBMb2FkaW5nT3ZlcmxheSxcbiAgRXJyb3JPdmVybGF5LFxuICB1c2VQcml2YXRlRGF0YVxufSA9IHdpbmRvdy5pbmNvcnRhU0RLQXBpID8/IHt9O1xuXG5leHBvcnQge1xuICB1c2VMb2NhbGUsXG4gIHVzZUNvbnRleHQsXG4gIHVzZVByb21wdHMsXG4gIHVzZVF1ZXJ5QnVpbGRlcixcbiAgdXNlQ3VzdG9tUXVlcnksXG4gIHVzZVF1ZXJ5LFxuICBMb2FkaW5nT3ZlcmxheSxcbiAgRXJyb3JPdmVybGF5LFxuICB1c2VQcml2YXRlRGF0YVxufTtcbiIsImZ1bmN0aW9uIHRpZHkoaXRlbXMsIC4uLmZucykge1xuICBpZiAodHlwZW9mIGl0ZW1zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBzdXBwbHkgdGhlIGRhdGEgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRpZHkoKVwiKTtcbiAgfVxuICBsZXQgcmVzdWx0ID0gaXRlbXM7XG4gIGZvciAoY29uc3QgZm4gb2YgZm5zKSB7XG4gICAgaWYgKGZuKSB7XG4gICAgICByZXN1bHQgPSBmbihyZXN1bHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgeyB0aWR5IH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD10aWR5LmpzLm1hcFxuIiwiZnVuY3Rpb24gZmlsdGVyKGZpbHRlckZuKSB7XG4gIGNvbnN0IF9maWx0ZXIgPSAoaXRlbXMpID0+IGl0ZW1zLmZpbHRlcihmaWx0ZXJGbik7XG4gIHJldHVybiBfZmlsdGVyO1xufVxuXG5leHBvcnQgeyBmaWx0ZXIgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZpbHRlci5qcy5tYXBcbiIsImZ1bmN0aW9uIHNpbmdsZU9yQXJyYXkoZCkge1xuICByZXR1cm4gZCA9PSBudWxsID8gW10gOiBBcnJheS5pc0FycmF5KGQpID8gZCA6IFtkXTtcbn1cblxuZXhwb3J0IHsgc2luZ2xlT3JBcnJheSB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2luZ2xlT3JBcnJheS5qcy5tYXBcbiIsIi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9weXRob24vY3B5dGhvbi9ibG9iL2E3NGVlYTIzOGY1YmFiYTE1Nzk3ZTJlOGI1NzBkMTUzYmM4NjkwYTcvTW9kdWxlcy9tYXRobW9kdWxlLmMjTDE0MjNcbmV4cG9ydCBjbGFzcyBBZGRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3BhcnRpYWxzID0gbmV3IEZsb2F0NjRBcnJheSgzMik7XG4gICAgdGhpcy5fbiA9IDA7XG4gIH1cbiAgYWRkKHgpIHtcbiAgICBjb25zdCBwID0gdGhpcy5fcGFydGlhbHM7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5fbiAmJiBqIDwgMzI7IGorKykge1xuICAgICAgY29uc3QgeSA9IHBbal0sXG4gICAgICAgIGhpID0geCArIHksXG4gICAgICAgIGxvID0gTWF0aC5hYnMoeCkgPCBNYXRoLmFicyh5KSA/IHggLSAoaGkgLSB5KSA6IHkgLSAoaGkgLSB4KTtcbiAgICAgIGlmIChsbykgcFtpKytdID0gbG87XG4gICAgICB4ID0gaGk7XG4gICAgfVxuICAgIHBbaV0gPSB4O1xuICAgIHRoaXMuX24gPSBpICsgMTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB2YWx1ZU9mKCkge1xuICAgIGNvbnN0IHAgPSB0aGlzLl9wYXJ0aWFscztcbiAgICBsZXQgbiA9IHRoaXMuX24sIHgsIHksIGxvLCBoaSA9IDA7XG4gICAgaWYgKG4gPiAwKSB7XG4gICAgICBoaSA9IHBbLS1uXTtcbiAgICAgIHdoaWxlIChuID4gMCkge1xuICAgICAgICB4ID0gaGk7XG4gICAgICAgIHkgPSBwWy0tbl07XG4gICAgICAgIGhpID0geCArIHk7XG4gICAgICAgIGxvID0geSAtIChoaSAtIHgpO1xuICAgICAgICBpZiAobG8pIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKG4gPiAwICYmICgobG8gPCAwICYmIHBbbiAtIDFdIDwgMCkgfHwgKGxvID4gMCAmJiBwW24gLSAxXSA+IDApKSkge1xuICAgICAgICB5ID0gbG8gKiAyO1xuICAgICAgICB4ID0gaGkgKyB5O1xuICAgICAgICBpZiAoeSA9PSB4IC0gaGkpIGhpID0geDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmc3VtKHZhbHVlcywgdmFsdWVvZikge1xuICBjb25zdCBhZGRlciA9IG5ldyBBZGRlcigpO1xuICBpZiAodmFsdWVvZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yIChsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBpZiAodmFsdWUgPSArdmFsdWUpIHtcbiAgICAgICAgYWRkZXIuYWRkKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbGV0IGluZGV4ID0gLTE7XG4gICAgZm9yIChsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBpZiAodmFsdWUgPSArdmFsdWVvZih2YWx1ZSwgKytpbmRleCwgdmFsdWVzKSkge1xuICAgICAgICBhZGRlci5hZGQodmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gK2FkZGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmN1bXN1bSh2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgY29uc3QgYWRkZXIgPSBuZXcgQWRkZXIoKTtcbiAgbGV0IGluZGV4ID0gLTE7XG4gIHJldHVybiBGbG9hdDY0QXJyYXkuZnJvbSh2YWx1ZXMsIHZhbHVlb2YgPT09IHVuZGVmaW5lZFxuICAgICAgPyB2ID0+IGFkZGVyLmFkZCgrdiB8fCAwKVxuICAgICAgOiB2ID0+IGFkZGVyLmFkZCgrdmFsdWVvZih2LCArK2luZGV4LCB2YWx1ZXMpIHx8IDApXG4gICk7XG59XG4iLCJleHBvcnQgY2xhc3MgSW50ZXJuTWFwIGV4dGVuZHMgTWFwIHtcbiAgY29uc3RydWN0b3IoZW50cmllcywga2V5ID0ga2V5b2YpIHtcbiAgICBzdXBlcigpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtfaW50ZXJuOiB7dmFsdWU6IG5ldyBNYXAoKX0sIF9rZXk6IHt2YWx1ZToga2V5fX0pO1xuICAgIGlmIChlbnRyaWVzICE9IG51bGwpIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIGVudHJpZXMpIHRoaXMuc2V0KGtleSwgdmFsdWUpO1xuICB9XG4gIGdldChrZXkpIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0KGludGVybl9nZXQodGhpcywga2V5KSk7XG4gIH1cbiAgaGFzKGtleSkge1xuICAgIHJldHVybiBzdXBlci5oYXMoaW50ZXJuX2dldCh0aGlzLCBrZXkpKTtcbiAgfVxuICBzZXQoa2V5LCB2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5zZXQoaW50ZXJuX3NldCh0aGlzLCBrZXkpLCB2YWx1ZSk7XG4gIH1cbiAgZGVsZXRlKGtleSkge1xuICAgIHJldHVybiBzdXBlci5kZWxldGUoaW50ZXJuX2RlbGV0ZSh0aGlzLCBrZXkpKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJuU2V0IGV4dGVuZHMgU2V0IHtcbiAgY29uc3RydWN0b3IodmFsdWVzLCBrZXkgPSBrZXlvZikge1xuICAgIHN1cGVyKCk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge19pbnRlcm46IHt2YWx1ZTogbmV3IE1hcCgpfSwgX2tleToge3ZhbHVlOiBrZXl9fSk7XG4gICAgaWYgKHZhbHVlcyAhPSBudWxsKSBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykgdGhpcy5hZGQodmFsdWUpO1xuICB9XG4gIGhhcyh2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5oYXMoaW50ZXJuX2dldCh0aGlzLCB2YWx1ZSkpO1xuICB9XG4gIGFkZCh2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5hZGQoaW50ZXJuX3NldCh0aGlzLCB2YWx1ZSkpO1xuICB9XG4gIGRlbGV0ZSh2YWx1ZSkge1xuICAgIHJldHVybiBzdXBlci5kZWxldGUoaW50ZXJuX2RlbGV0ZSh0aGlzLCB2YWx1ZSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludGVybl9nZXQoe19pbnRlcm4sIF9rZXl9LCB2YWx1ZSkge1xuICBjb25zdCBrZXkgPSBfa2V5KHZhbHVlKTtcbiAgcmV0dXJuIF9pbnRlcm4uaGFzKGtleSkgPyBfaW50ZXJuLmdldChrZXkpIDogdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGludGVybl9zZXQoe19pbnRlcm4sIF9rZXl9LCB2YWx1ZSkge1xuICBjb25zdCBrZXkgPSBfa2V5KHZhbHVlKTtcbiAgaWYgKF9pbnRlcm4uaGFzKGtleSkpIHJldHVybiBfaW50ZXJuLmdldChrZXkpO1xuICBfaW50ZXJuLnNldChrZXksIHZhbHVlKTtcbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpbnRlcm5fZGVsZXRlKHtfaW50ZXJuLCBfa2V5fSwgdmFsdWUpIHtcbiAgY29uc3Qga2V5ID0gX2tleSh2YWx1ZSk7XG4gIGlmIChfaW50ZXJuLmhhcyhrZXkpKSB7XG4gICAgdmFsdWUgPSBfaW50ZXJuLmdldCh2YWx1ZSk7XG4gICAgX2ludGVybi5kZWxldGUoa2V5KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGtleW9mKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZS52YWx1ZU9mKCkgOiB2YWx1ZTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59XG4iLCJpbXBvcnQge0ludGVybk1hcH0gZnJvbSBcImludGVybm1hcFwiO1xuaW1wb3J0IGlkZW50aXR5IGZyb20gXCIuL2lkZW50aXR5LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdyb3VwKHZhbHVlcywgLi4ua2V5cykge1xuICByZXR1cm4gbmVzdCh2YWx1ZXMsIGlkZW50aXR5LCBpZGVudGl0eSwga2V5cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBncm91cHModmFsdWVzLCAuLi5rZXlzKSB7XG4gIHJldHVybiBuZXN0KHZhbHVlcywgQXJyYXkuZnJvbSwgaWRlbnRpdHksIGtleXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcm9sbHVwKHZhbHVlcywgcmVkdWNlLCAuLi5rZXlzKSB7XG4gIHJldHVybiBuZXN0KHZhbHVlcywgaWRlbnRpdHksIHJlZHVjZSwga2V5cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb2xsdXBzKHZhbHVlcywgcmVkdWNlLCAuLi5rZXlzKSB7XG4gIHJldHVybiBuZXN0KHZhbHVlcywgQXJyYXkuZnJvbSwgcmVkdWNlLCBrZXlzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluZGV4KHZhbHVlcywgLi4ua2V5cykge1xuICByZXR1cm4gbmVzdCh2YWx1ZXMsIGlkZW50aXR5LCB1bmlxdWUsIGtleXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5kZXhlcyh2YWx1ZXMsIC4uLmtleXMpIHtcbiAgcmV0dXJuIG5lc3QodmFsdWVzLCBBcnJheS5mcm9tLCB1bmlxdWUsIGtleXMpO1xufVxuXG5mdW5jdGlvbiB1bmlxdWUodmFsdWVzKSB7XG4gIGlmICh2YWx1ZXMubGVuZ3RoICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoXCJkdXBsaWNhdGUga2V5XCIpO1xuICByZXR1cm4gdmFsdWVzWzBdO1xufVxuXG5mdW5jdGlvbiBuZXN0KHZhbHVlcywgbWFwLCByZWR1Y2UsIGtleXMpIHtcbiAgcmV0dXJuIChmdW5jdGlvbiByZWdyb3VwKHZhbHVlcywgaSkge1xuICAgIGlmIChpID49IGtleXMubGVuZ3RoKSByZXR1cm4gcmVkdWNlKHZhbHVlcyk7XG4gICAgY29uc3QgZ3JvdXBzID0gbmV3IEludGVybk1hcCgpO1xuICAgIGNvbnN0IGtleW9mID0ga2V5c1tpKytdO1xuICAgIGxldCBpbmRleCA9IC0xO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBjb25zdCBrZXkgPSBrZXlvZih2YWx1ZSwgKytpbmRleCwgdmFsdWVzKTtcbiAgICAgIGNvbnN0IGdyb3VwID0gZ3JvdXBzLmdldChrZXkpO1xuICAgICAgaWYgKGdyb3VwKSBncm91cC5wdXNoKHZhbHVlKTtcbiAgICAgIGVsc2UgZ3JvdXBzLnNldChrZXksIFt2YWx1ZV0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlc10gb2YgZ3JvdXBzKSB7XG4gICAgICBncm91cHMuc2V0KGtleSwgcmVncm91cCh2YWx1ZXMsIGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcChncm91cHMpO1xuICB9KSh2YWx1ZXMsIDApO1xufVxuIiwiaW1wb3J0IHsgc2luZ2xlT3JBcnJheSB9IGZyb20gJy4vaGVscGVycy9zaW5nbGVPckFycmF5LmpzJztcblxuZnVuY3Rpb24gc3VtbWFyaXplKHN1bW1hcml6ZVNwZWMsIG9wdGlvbnMpIHtcbiAgY29uc3QgX3N1bW1hcml6ZSA9IChpdGVtcykgPT4ge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zICE9IG51bGwgPyBvcHRpb25zIDoge307XG4gICAgY29uc3Qgc3VtbWFyaXplZCA9IHt9O1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhzdW1tYXJpemVTcGVjKTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICBzdW1tYXJpemVkW2tleV0gPSBzdW1tYXJpemVTcGVjW2tleV0oaXRlbXMpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5yZXN0ICYmIGl0ZW1zLmxlbmd0aCkge1xuICAgICAgY29uc3Qgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzKGl0ZW1zWzBdKTtcbiAgICAgIGZvciAoY29uc3Qgb2JqS2V5IG9mIG9iamVjdEtleXMpIHtcbiAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMob2JqS2V5KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHN1bW1hcml6ZWRbb2JqS2V5XSA9IG9wdGlvbnMucmVzdChvYmpLZXkpKGl0ZW1zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtzdW1tYXJpemVkXTtcbiAgfTtcbiAgcmV0dXJuIF9zdW1tYXJpemU7XG59XG5mdW5jdGlvbiBfc3VtbWFyaXplSGVscGVyKGl0ZW1zLCBzdW1tYXJ5Rm4sIHByZWRpY2F0ZUZuLCBrZXlzKSB7XG4gIGlmICghaXRlbXMubGVuZ3RoKVxuICAgIHJldHVybiBbXTtcbiAgY29uc3Qgc3VtbWFyaXplZCA9IHt9O1xuICBsZXQga2V5c0FycjtcbiAgaWYgKGtleXMgPT0gbnVsbCkge1xuICAgIGtleXNBcnIgPSBPYmplY3Qua2V5cyhpdGVtc1swXSk7XG4gIH0gZWxzZSB7XG4gICAga2V5c0FyciA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5SW5wdXQgb2Ygc2luZ2xlT3JBcnJheShrZXlzKSkge1xuICAgICAgaWYgKHR5cGVvZiBrZXlJbnB1dCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGtleXNBcnIucHVzaCguLi5rZXlJbnB1dChpdGVtcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAga2V5c0Fyci5wdXNoKGtleUlucHV0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0Fycikge1xuICAgIGlmIChwcmVkaWNhdGVGbikge1xuICAgICAgY29uc3QgdmVjdG9yID0gaXRlbXMubWFwKChkKSA9PiBkW2tleV0pO1xuICAgICAgaWYgKCFwcmVkaWNhdGVGbih2ZWN0b3IpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBzdW1tYXJpemVkW2tleV0gPSBzdW1tYXJ5Rm4oa2V5KShpdGVtcyk7XG4gIH1cbiAgcmV0dXJuIFtzdW1tYXJpemVkXTtcbn1cbmZ1bmN0aW9uIHN1bW1hcml6ZUFsbChzdW1tYXJ5Rm4pIHtcbiAgY29uc3QgX3N1bW1hcml6ZUFsbCA9IChpdGVtcykgPT4gX3N1bW1hcml6ZUhlbHBlcihpdGVtcywgc3VtbWFyeUZuKTtcbiAgcmV0dXJuIF9zdW1tYXJpemVBbGw7XG59XG5mdW5jdGlvbiBzdW1tYXJpemVJZihwcmVkaWNhdGVGbiwgc3VtbWFyeUZuKSB7XG4gIGNvbnN0IF9zdW1tYXJpemVJZiA9IChpdGVtcykgPT4gX3N1bW1hcml6ZUhlbHBlcihpdGVtcywgc3VtbWFyeUZuLCBwcmVkaWNhdGVGbik7XG4gIHJldHVybiBfc3VtbWFyaXplSWY7XG59XG5mdW5jdGlvbiBzdW1tYXJpemVBdChrZXlzLCBzdW1tYXJ5Rm4pIHtcbiAgY29uc3QgX3N1bW1hcml6ZUF0ID0gKGl0ZW1zKSA9PiBfc3VtbWFyaXplSGVscGVyKGl0ZW1zLCBzdW1tYXJ5Rm4sIHZvaWQgMCwga2V5cyk7XG4gIHJldHVybiBfc3VtbWFyaXplQXQ7XG59XG5cbmV4cG9ydCB7IHN1bW1hcml6ZSwgc3VtbWFyaXplQWxsLCBzdW1tYXJpemVBdCwgc3VtbWFyaXplSWYgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN1bW1hcml6ZS5qcy5tYXBcbiIsImZ1bmN0aW9uIG11dGF0ZShtdXRhdGVTcGVjKSB7XG4gIGNvbnN0IF9tdXRhdGUgPSAoaXRlbXMpID0+IHtcbiAgICBjb25zdCBtdXRhdGVkSXRlbXMgPSBpdGVtcy5tYXAoKGQpID0+ICh7Li4uZH0pKTtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBtdXRhdGVkSXRlbSBvZiBtdXRhdGVkSXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3Qga2V5IGluIG11dGF0ZVNwZWMpIHtcbiAgICAgICAgY29uc3QgbXV0YXRlU3BlY1ZhbHVlID0gbXV0YXRlU3BlY1trZXldO1xuICAgICAgICBjb25zdCBtdXRhdGVkUmVzdWx0ID0gdHlwZW9mIG11dGF0ZVNwZWNWYWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gbXV0YXRlU3BlY1ZhbHVlKG11dGF0ZWRJdGVtLCBpLCBtdXRhdGVkSXRlbXMpIDogbXV0YXRlU3BlY1ZhbHVlO1xuICAgICAgICBtdXRhdGVkSXRlbVtrZXldID0gbXV0YXRlZFJlc3VsdDtcbiAgICAgIH1cbiAgICAgICsraTtcbiAgICB9XG4gICAgcmV0dXJuIG11dGF0ZWRJdGVtcztcbiAgfTtcbiAgcmV0dXJuIF9tdXRhdGU7XG59XG5cbmV4cG9ydCB7IG11dGF0ZSB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bXV0YXRlLmpzLm1hcFxuIiwiZnVuY3Rpb24gYXNzaWduR3JvdXBLZXlzKGQsIGtleXMpIHtcbiAgaWYgKGQgPT0gbnVsbCB8fCB0eXBlb2YgZCAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KGQpKVxuICAgIHJldHVybiBkO1xuICBjb25zdCBrZXlzT2JqID0gT2JqZWN0LmZyb21FbnRyaWVzKGtleXMuZmlsdGVyKChrZXkpID0+IHR5cGVvZiBrZXlbMF0gIT09IFwiZnVuY3Rpb25cIiAmJiBrZXlbMF0gIT0gbnVsbCkpO1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihrZXlzT2JqLCBkKTtcbn1cblxuZXhwb3J0IHsgYXNzaWduR3JvdXBLZXlzIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1hc3NpZ25Hcm91cEtleXMuanMubWFwXG4iLCJmdW5jdGlvbiBncm91cFRyYXZlcnNhbChncm91cGVkLCBvdXRwdXRHcm91cGVkLCBrZXlzLCBhZGRTdWJncm91cCwgYWRkTGVhdmVzLCBsZXZlbCA9IDApIHtcbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgZ3JvdXBlZC5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCBrZXlzSGVyZSA9IFsuLi5rZXlzLCBrZXldO1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgY29uc3Qgc3ViZ3JvdXAgPSBhZGRTdWJncm91cChvdXRwdXRHcm91cGVkLCBrZXlzSGVyZSwgbGV2ZWwpO1xuICAgICAgZ3JvdXBUcmF2ZXJzYWwodmFsdWUsIHN1Ymdyb3VwLCBrZXlzSGVyZSwgYWRkU3ViZ3JvdXAsIGFkZExlYXZlcywgbGV2ZWwgKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWRkTGVhdmVzKG91dHB1dEdyb3VwZWQsIGtleXNIZXJlLCB2YWx1ZSwgbGV2ZWwpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0cHV0R3JvdXBlZDtcbn1cblxuZXhwb3J0IHsgZ3JvdXBUcmF2ZXJzYWwgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWdyb3VwVHJhdmVyc2FsLmpzLm1hcFxuIiwiaW1wb3J0IHsgZ3JvdXBUcmF2ZXJzYWwgfSBmcm9tICcuL2dyb3VwVHJhdmVyc2FsLmpzJztcblxuZnVuY3Rpb24gZ3JvdXBNYXAoZ3JvdXBlZCwgZ3JvdXBGbiwga2V5Rm4gPSAoa2V5cykgPT4ga2V5c1trZXlzLmxlbmd0aCAtIDFdKSB7XG4gIGZ1bmN0aW9uIGFkZFN1Ymdyb3VwKHBhcmVudEdyb3VwZWQsIGtleXMpIHtcbiAgICBjb25zdCBzdWJncm91cCA9IG5ldyBNYXAoKTtcbiAgICBwYXJlbnRHcm91cGVkLnNldChrZXlGbihrZXlzKSwgc3ViZ3JvdXApO1xuICAgIHJldHVybiBzdWJncm91cDtcbiAgfVxuICBmdW5jdGlvbiBhZGRMZWF2ZXMocGFyZW50R3JvdXBlZCwga2V5cywgdmFsdWVzKSB7XG4gICAgcGFyZW50R3JvdXBlZC5zZXQoa2V5Rm4oa2V5cyksIGdyb3VwRm4odmFsdWVzLCBrZXlzKSk7XG4gIH1cbiAgY29uc3Qgb3V0cHV0R3JvdXBlZCA9IG5ldyBNYXAoKTtcbiAgZ3JvdXBUcmF2ZXJzYWwoZ3JvdXBlZCwgb3V0cHV0R3JvdXBlZCwgW10sIGFkZFN1Ymdyb3VwLCBhZGRMZWF2ZXMpO1xuICByZXR1cm4gb3V0cHV0R3JvdXBlZDtcbn1cblxuZXhwb3J0IHsgZ3JvdXBNYXAgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWdyb3VwTWFwLmpzLm1hcFxuIiwiY29uc3QgaWRlbnRpdHkgPSAoZCkgPT4gZDtcblxuZXhwb3J0IHsgaWRlbnRpdHkgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlkZW50aXR5LmpzLm1hcFxuIiwiZnVuY3Rpb24gaXNPYmplY3Qob2JqKSB7XG4gIGNvbnN0IHR5cGUgPSB0eXBlb2Ygb2JqO1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKHR5cGUgPT09IFwib2JqZWN0XCIgfHwgdHlwZSA9PT0gXCJmdW5jdGlvblwiKTtcbn1cblxuZXhwb3J0IHsgaXNPYmplY3QgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlzT2JqZWN0LmpzLm1hcFxuIiwiaW1wb3J0IHsgZ3JvdXAgfSBmcm9tICdkMy1hcnJheSc7XG5pbXBvcnQgeyBhc3NpZ25Hcm91cEtleXMgfSBmcm9tICcuL2hlbHBlcnMvYXNzaWduR3JvdXBLZXlzLmpzJztcbmltcG9ydCB7IGdyb3VwTWFwIH0gZnJvbSAnLi9oZWxwZXJzL2dyb3VwTWFwLmpzJztcbmltcG9ydCB7IGdyb3VwVHJhdmVyc2FsIH0gZnJvbSAnLi9oZWxwZXJzL2dyb3VwVHJhdmVyc2FsLmpzJztcbmltcG9ydCB7IGlkZW50aXR5IH0gZnJvbSAnLi9oZWxwZXJzL2lkZW50aXR5LmpzJztcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSAnLi9oZWxwZXJzL2lzT2JqZWN0LmpzJztcbmltcG9ydCB7IHNpbmdsZU9yQXJyYXkgfSBmcm9tICcuL2hlbHBlcnMvc2luZ2xlT3JBcnJheS5qcyc7XG5cbmZ1bmN0aW9uIGdyb3VwQnkoZ3JvdXBLZXlzLCBmbnMsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBmbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGZucyA9IFtmbnNdO1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgZm5zICE9IG51bGwgJiYgIUFycmF5LmlzQXJyYXkoZm5zKSkge1xuICAgIG9wdGlvbnMgPSBmbnM7XG4gIH1cbiAgY29uc3QgX2dyb3VwQnkgPSAoaXRlbXMpID0+IHtcbiAgICBjb25zdCBncm91cGVkID0gbWFrZUdyb3VwZWQoaXRlbXMsIGdyb3VwS2V5cyk7XG4gICAgY29uc3QgcmVzdWx0cyA9IHJ1bkZsb3coZ3JvdXBlZCwgZm5zLCBvcHRpb25zID09IG51bGwgPyB2b2lkIDAgOiBvcHRpb25zLmFkZEdyb3VwS2V5cyk7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCA/IHZvaWQgMCA6IG9wdGlvbnMuZXhwb3J0KSB7XG4gICAgICBzd2l0Y2ggKG9wdGlvbnMuZXhwb3J0KSB7XG4gICAgICAgIGNhc2UgXCJncm91cGVkXCI6XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgIGNhc2UgXCJsZXZlbHNcIjpcbiAgICAgICAgICByZXR1cm4gZXhwb3J0TGV2ZWxzKHJlc3VsdHMsIG9wdGlvbnMpO1xuICAgICAgICBjYXNlIFwiZW50cmllcy1vYmpcIjpcbiAgICAgICAgY2FzZSBcImVudHJpZXNPYmplY3RcIjpcbiAgICAgICAgICByZXR1cm4gZXhwb3J0TGV2ZWxzKHJlc3VsdHMsIHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBleHBvcnQ6IFwibGV2ZWxzXCIsXG4gICAgICAgICAgICBsZXZlbHM6IFtcImVudHJpZXMtb2JqZWN0XCJdXG4gICAgICAgICAgfSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIGV4cG9ydExldmVscyhyZXN1bHRzLCB7XG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgZXhwb3J0OiBcImxldmVsc1wiLFxuICAgICAgICAgICAgbGV2ZWxzOiBbb3B0aW9ucy5leHBvcnRdXG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHVuZ3JvdXBlZCA9IHVuZ3JvdXAocmVzdWx0cywgb3B0aW9ucyA9PSBudWxsID8gdm9pZCAwIDogb3B0aW9ucy5hZGRHcm91cEtleXMpO1xuICAgIHJldHVybiB1bmdyb3VwZWQ7XG4gIH07XG4gIHJldHVybiBfZ3JvdXBCeTtcbn1cbmdyb3VwQnkuZ3JvdXBlZCA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJncm91cGVkXCJ9KTtcbmdyb3VwQnkuZW50cmllcyA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJlbnRyaWVzXCJ9KTtcbmdyb3VwQnkuZW50cmllc09iamVjdCA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJlbnRyaWVzLW9iamVjdFwifSk7XG5ncm91cEJ5Lm9iamVjdCA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJvYmplY3RcIn0pO1xuZ3JvdXBCeS5tYXAgPSAob3B0aW9ucykgPT4gKHsuLi5vcHRpb25zLCBleHBvcnQ6IFwibWFwXCJ9KTtcbmdyb3VwQnkua2V5cyA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJrZXlzXCJ9KTtcbmdyb3VwQnkudmFsdWVzID0gKG9wdGlvbnMpID0+ICh7Li4ub3B0aW9ucywgZXhwb3J0OiBcInZhbHVlc1wifSk7XG5ncm91cEJ5LmxldmVscyA9IChvcHRpb25zKSA9PiAoey4uLm9wdGlvbnMsIGV4cG9ydDogXCJsZXZlbHNcIn0pO1xuZnVuY3Rpb24gcnVuRmxvdyhpdGVtcywgZm5zLCBhZGRHcm91cEtleXMpIHtcbiAgbGV0IHJlc3VsdCA9IGl0ZW1zO1xuICBpZiAoIShmbnMgPT0gbnVsbCA/IHZvaWQgMCA6IGZucy5sZW5ndGgpKVxuICAgIHJldHVybiByZXN1bHQ7XG4gIGZvciAoY29uc3QgZm4gb2YgZm5zKSB7XG4gICAgaWYgKCFmbilcbiAgICAgIGNvbnRpbnVlO1xuICAgIHJlc3VsdCA9IGdyb3VwTWFwKHJlc3VsdCwgKGl0ZW1zMiwga2V5cykgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IHtncm91cEtleXM6IGtleXN9O1xuICAgICAgbGV0IGxlYWZJdGVtc01hcHBlZCA9IGZuKGl0ZW1zMiwgY29udGV4dCk7XG4gICAgICBpZiAoYWRkR3JvdXBLZXlzICE9PSBmYWxzZSkge1xuICAgICAgICBsZWFmSXRlbXNNYXBwZWQgPSBsZWFmSXRlbXNNYXBwZWQubWFwKChpdGVtKSA9PiBhc3NpZ25Hcm91cEtleXMoaXRlbSwga2V5cykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlYWZJdGVtc01hcHBlZDtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gbWFrZUdyb3VwZWQoaXRlbXMsIGdyb3VwS2V5cykge1xuICBjb25zdCBncm91cEtleUZucyA9IHNpbmdsZU9yQXJyYXkoZ3JvdXBLZXlzKS5tYXAoKGtleSwgaSkgPT4ge1xuICAgIGNvbnN0IGtleUZuID0gdHlwZW9mIGtleSA9PT0gXCJmdW5jdGlvblwiID8ga2V5IDogKGQpID0+IGRba2V5XTtcbiAgICBjb25zdCBrZXlDYWNoZSA9IG5ldyBNYXAoKTtcbiAgICByZXR1cm4gKGQpID0+IHtcbiAgICAgIGNvbnN0IGtleVZhbHVlID0ga2V5Rm4oZCk7XG4gICAgICBjb25zdCBrZXlWYWx1ZU9mID0gaXNPYmplY3Qoa2V5VmFsdWUpID8ga2V5VmFsdWUudmFsdWVPZigpIDoga2V5VmFsdWU7XG4gICAgICBpZiAoa2V5Q2FjaGUuaGFzKGtleVZhbHVlT2YpKSB7XG4gICAgICAgIHJldHVybiBrZXlDYWNoZS5nZXQoa2V5VmFsdWVPZik7XG4gICAgICB9XG4gICAgICBjb25zdCBrZXlXaXRoTmFtZSA9IFtrZXksIGtleVZhbHVlXTtcbiAgICAgIGtleUNhY2hlLnNldChrZXlWYWx1ZU9mLCBrZXlXaXRoTmFtZSk7XG4gICAgICByZXR1cm4ga2V5V2l0aE5hbWU7XG4gICAgfTtcbiAgfSk7XG4gIGNvbnN0IGdyb3VwZWQgPSBncm91cChpdGVtcywgLi4uZ3JvdXBLZXlGbnMpO1xuICByZXR1cm4gZ3JvdXBlZDtcbn1cbmZ1bmN0aW9uIHVuZ3JvdXAoZ3JvdXBlZCwgYWRkR3JvdXBLZXlzKSB7XG4gIGNvbnN0IGl0ZW1zID0gW107XG4gIGdyb3VwVHJhdmVyc2FsKGdyb3VwZWQsIGl0ZW1zLCBbXSwgaWRlbnRpdHksIChyb290LCBrZXlzLCB2YWx1ZXMpID0+IHtcbiAgICBsZXQgdmFsdWVzVG9BZGQgPSB2YWx1ZXM7XG4gICAgaWYgKGFkZEdyb3VwS2V5cyAhPT0gZmFsc2UpIHtcbiAgICAgIHZhbHVlc1RvQWRkID0gdmFsdWVzLm1hcCgoZCkgPT4gYXNzaWduR3JvdXBLZXlzKGQsIGtleXMpKTtcbiAgICB9XG4gICAgcm9vdC5wdXNoKC4uLnZhbHVlc1RvQWRkKTtcbiAgfSk7XG4gIHJldHVybiBpdGVtcztcbn1cbmNvbnN0IGRlZmF1bHRDb21wb3NpdGVLZXkgPSAoa2V5cykgPT4ga2V5cy5qb2luKFwiL1wiKTtcbmZ1bmN0aW9uIHByb2Nlc3NGcm9tR3JvdXBzT3B0aW9ucyhvcHRpb25zKSB7XG4gIHZhciBfYTtcbiAgY29uc3Qge1xuICAgIGZsYXQsXG4gICAgc2luZ2xlLFxuICAgIG1hcExlYWYgPSBpZGVudGl0eSxcbiAgICBtYXBMZWF2ZXMgPSBpZGVudGl0eSxcbiAgICBhZGRHcm91cEtleXNcbiAgfSA9IG9wdGlvbnM7XG4gIGxldCBjb21wb3NpdGVLZXk7XG4gIGlmIChvcHRpb25zLmZsYXQpIHtcbiAgICBjb21wb3NpdGVLZXkgPSAoX2EgPSBvcHRpb25zLmNvbXBvc2l0ZUtleSkgIT0gbnVsbCA/IF9hIDogZGVmYXVsdENvbXBvc2l0ZUtleTtcbiAgfVxuICBjb25zdCBncm91cEZuID0gKHZhbHVlcywga2V5cykgPT4ge1xuICAgIHJldHVybiBzaW5nbGUgPyBtYXBMZWFmKGFkZEdyb3VwS2V5cyA9PT0gZmFsc2UgPyB2YWx1ZXNbMF0gOiBhc3NpZ25Hcm91cEtleXModmFsdWVzWzBdLCBrZXlzKSkgOiBtYXBMZWF2ZXModmFsdWVzLm1hcCgoZCkgPT4gbWFwTGVhZihhZGRHcm91cEtleXMgPT09IGZhbHNlID8gZCA6IGFzc2lnbkdyb3VwS2V5cyhkLCBrZXlzKSkpKTtcbiAgfTtcbiAgY29uc3Qga2V5Rm4gPSBmbGF0ID8gKGtleXMpID0+IGNvbXBvc2l0ZUtleShrZXlzLm1hcCgoZCkgPT4gZFsxXSkpIDogKGtleXMpID0+IGtleXNba2V5cy5sZW5ndGggLSAxXVsxXTtcbiAgcmV0dXJuIHtncm91cEZuLCBrZXlGbn07XG59XG5mdW5jdGlvbiBleHBvcnRMZXZlbHMoZ3JvdXBlZCwgb3B0aW9ucykge1xuICBjb25zdCB7Z3JvdXBGbiwga2V5Rm59ID0gcHJvY2Vzc0Zyb21Hcm91cHNPcHRpb25zKG9wdGlvbnMpO1xuICBsZXQge21hcEVudHJ5ID0gaWRlbnRpdHl9ID0gb3B0aW9ucztcbiAgY29uc3Qge2xldmVscyA9IFtcImVudHJpZXNcIl19ID0gb3B0aW9ucztcbiAgY29uc3QgbGV2ZWxTcGVjcyA9IFtdO1xuICBmb3IgKGNvbnN0IGxldmVsT3B0aW9uIG9mIGxldmVscykge1xuICAgIHN3aXRjaCAobGV2ZWxPcHRpb24pIHtcbiAgICAgIGNhc2UgXCJlbnRyaWVzXCI6XG4gICAgICBjYXNlIFwiZW50cmllcy1vYmplY3RcIjpcbiAgICAgIGNhc2UgXCJlbnRyaWVzLW9ialwiOlxuICAgICAgY2FzZSBcImVudHJpZXNPYmplY3RcIjoge1xuICAgICAgICBjb25zdCBsZXZlbE1hcEVudHJ5ID0gKGxldmVsT3B0aW9uID09PSBcImVudHJpZXMtb2JqZWN0XCIgfHwgbGV2ZWxPcHRpb24gPT09IFwiZW50cmllcy1vYmpcIiB8fCBsZXZlbE9wdGlvbiA9PT0gXCJlbnRyaWVzT2JqZWN0XCIpICYmIG9wdGlvbnMubWFwRW50cnkgPT0gbnVsbCA/IChba2V5LCB2YWx1ZXNdKSA9PiAoe2tleSwgdmFsdWVzfSkgOiBtYXBFbnRyeTtcbiAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKHtcbiAgICAgICAgICBpZDogXCJlbnRyaWVzXCIsXG4gICAgICAgICAgY3JlYXRlRW1wdHlTdWJncm91cDogKCkgPT4gW10sXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5LCBsZXZlbCkgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZC5wdXNoKGxldmVsTWFwRW50cnkoW2tleSwgbmV3U3ViZ3JvdXBdLCBsZXZlbCkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYWRkTGVhZjogKHBhcmVudEdyb3VwZWQsIGtleSwgdmFsdWVzLCBsZXZlbCkgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZC5wdXNoKGxldmVsTWFwRW50cnkoW2tleSwgdmFsdWVzXSwgbGV2ZWwpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJtYXBcIjpcbiAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKHtcbiAgICAgICAgICBpZDogXCJtYXBcIixcbiAgICAgICAgICBjcmVhdGVFbXB0eVN1Ymdyb3VwOiAoKSA9PiBuZXcgTWFwKCksXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5KSA9PiB7XG4gICAgICAgICAgICBwYXJlbnRHcm91cGVkLnNldChrZXksIG5ld1N1Ymdyb3VwKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFkZExlYWY6IChwYXJlbnRHcm91cGVkLCBrZXksIHZhbHVlcykgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZC5zZXQoa2V5LCB2YWx1ZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgICBsZXZlbFNwZWNzLnB1c2goe1xuICAgICAgICAgIGlkOiBcIm9iamVjdFwiLFxuICAgICAgICAgIGNyZWF0ZUVtcHR5U3ViZ3JvdXA6ICgpID0+ICh7fSksXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5KSA9PiB7XG4gICAgICAgICAgICBwYXJlbnRHcm91cGVkW2tleV0gPSBuZXdTdWJncm91cDtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFkZExlYWY6IChwYXJlbnRHcm91cGVkLCBrZXksIHZhbHVlcykgPT4ge1xuICAgICAgICAgICAgcGFyZW50R3JvdXBlZFtrZXldID0gdmFsdWVzO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImtleXNcIjpcbiAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKHtcbiAgICAgICAgICBpZDogXCJrZXlzXCIsXG4gICAgICAgICAgY3JlYXRlRW1wdHlTdWJncm91cDogKCkgPT4gW10sXG4gICAgICAgICAgYWRkU3ViZ3JvdXA6IChwYXJlbnRHcm91cGVkLCBuZXdTdWJncm91cCwga2V5KSA9PiB7XG4gICAgICAgICAgICBwYXJlbnRHcm91cGVkLnB1c2goW2tleSwgbmV3U3ViZ3JvdXBdKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFkZExlYWY6IChwYXJlbnRHcm91cGVkLCBrZXkpID0+IHtcbiAgICAgICAgICAgIHBhcmVudEdyb3VwZWQucHVzaChrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInZhbHVlc1wiOlxuICAgICAgICBsZXZlbFNwZWNzLnB1c2goe1xuICAgICAgICAgIGlkOiBcInZhbHVlc1wiLFxuICAgICAgICAgIGNyZWF0ZUVtcHR5U3ViZ3JvdXA6ICgpID0+IFtdLFxuICAgICAgICAgIGFkZFN1Ymdyb3VwOiAocGFyZW50R3JvdXBlZCwgbmV3U3ViZ3JvdXApID0+IHtcbiAgICAgICAgICAgIHBhcmVudEdyb3VwZWQucHVzaChuZXdTdWJncm91cCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBhZGRMZWFmOiAocGFyZW50R3JvdXBlZCwga2V5LCB2YWx1ZXMpID0+IHtcbiAgICAgICAgICAgIHBhcmVudEdyb3VwZWQucHVzaCh2YWx1ZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAodHlwZW9mIGxldmVsT3B0aW9uID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgbGV2ZWxTcGVjcy5wdXNoKGxldmVsT3B0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCBhZGRTdWJncm91cCA9IChwYXJlbnRHcm91cGVkLCBrZXlzLCBsZXZlbCkgPT4ge1xuICAgIHZhciBfYSwgX2I7XG4gICAgaWYgKG9wdGlvbnMuZmxhdCkge1xuICAgICAgcmV0dXJuIHBhcmVudEdyb3VwZWQ7XG4gICAgfVxuICAgIGNvbnN0IGxldmVsU3BlYyA9IChfYSA9IGxldmVsU3BlY3NbbGV2ZWxdKSAhPSBudWxsID8gX2EgOiBsZXZlbFNwZWNzW2xldmVsU3BlY3MubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgbmV4dExldmVsU3BlYyA9IChfYiA9IGxldmVsU3BlY3NbbGV2ZWwgKyAxXSkgIT0gbnVsbCA/IF9iIDogbGV2ZWxTcGVjO1xuICAgIGNvbnN0IG5ld1N1Ymdyb3VwID0gbmV4dExldmVsU3BlYy5jcmVhdGVFbXB0eVN1Ymdyb3VwKCk7XG4gICAgbGV2ZWxTcGVjLmFkZFN1Ymdyb3VwKHBhcmVudEdyb3VwZWQsIG5ld1N1Ymdyb3VwLCBrZXlGbihrZXlzKSwgbGV2ZWwpO1xuICAgIHJldHVybiBuZXdTdWJncm91cDtcbiAgfTtcbiAgY29uc3QgYWRkTGVhZiA9IChwYXJlbnRHcm91cGVkLCBrZXlzLCB2YWx1ZXMsIGxldmVsKSA9PiB7XG4gICAgdmFyIF9hO1xuICAgIGNvbnN0IGxldmVsU3BlYyA9IChfYSA9IGxldmVsU3BlY3NbbGV2ZWxdKSAhPSBudWxsID8gX2EgOiBsZXZlbFNwZWNzW2xldmVsU3BlY3MubGVuZ3RoIC0gMV07XG4gICAgbGV2ZWxTcGVjLmFkZExlYWYocGFyZW50R3JvdXBlZCwga2V5Rm4oa2V5cyksIGdyb3VwRm4odmFsdWVzLCBrZXlzKSwgbGV2ZWwpO1xuICB9O1xuICBjb25zdCBpbml0aWFsT3V0cHV0T2JqZWN0ID0gbGV2ZWxTcGVjc1swXS5jcmVhdGVFbXB0eVN1Ymdyb3VwKCk7XG4gIHJldHVybiBncm91cFRyYXZlcnNhbChncm91cGVkLCBpbml0aWFsT3V0cHV0T2JqZWN0LCBbXSwgYWRkU3ViZ3JvdXAsIGFkZExlYWYpO1xufVxuXG5leHBvcnQgeyBncm91cEJ5IH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1ncm91cEJ5LmpzLm1hcFxuIiwiaW1wb3J0IHsgZnN1bSB9IGZyb20gJ2QzLWFycmF5JztcblxuZnVuY3Rpb24gc3VtKGtleSwgb3B0aW9ucykge1xuICBsZXQga2V5Rm4gPSB0eXBlb2Yga2V5ID09PSBcImZ1bmN0aW9uXCIgPyBrZXkgOiAoZCkgPT4gZFtrZXldO1xuICBpZiAob3B0aW9ucyA9PSBudWxsID8gdm9pZCAwIDogb3B0aW9ucy5wcmVkaWNhdGUpIHtcbiAgICBjb25zdCBvcmlnaW5hbEtleUZuID0ga2V5Rm47XG4gICAgY29uc3QgcHJlZGljYXRlID0gb3B0aW9ucy5wcmVkaWNhdGU7XG4gICAga2V5Rm4gPSAoZCwgaW5kZXgsIGFycmF5KSA9PiBwcmVkaWNhdGUoZCwgaW5kZXgsIGFycmF5KSA/IG9yaWdpbmFsS2V5Rm4oZCwgaW5kZXgsIGFycmF5KSA6IDA7XG4gIH1cbiAgcmV0dXJuIChpdGVtcykgPT4gZnN1bShpdGVtcywga2V5Rm4pO1xufVxuXG5leHBvcnQgeyBzdW0gfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN1bS5qcy5tYXBcbiIsImZ1bmN0aW9uIGF1dG9kZXRlY3RCeU1hcChpdGVtc0EsIGl0ZW1zQikge1xuICBpZiAoaXRlbXNBLmxlbmd0aCA9PT0gMCB8fCBpdGVtc0IubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiB7fTtcbiAgY29uc3Qga2V5c0EgPSBPYmplY3Qua2V5cyhpdGVtc0FbMF0pO1xuICBjb25zdCBrZXlzQiA9IE9iamVjdC5rZXlzKGl0ZW1zQlswXSk7XG4gIGNvbnN0IGJ5TWFwID0ge307XG4gIGZvciAoY29uc3Qga2V5IG9mIGtleXNBKSB7XG4gICAgaWYgKGtleXNCLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgIGJ5TWFwW2tleV0gPSBrZXk7XG4gICAgfVxuICB9XG4gIHJldHVybiBieU1hcDtcbn1cbmZ1bmN0aW9uIG1ha2VCeU1hcChieSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShieSkpIHtcbiAgICBjb25zdCBieU1hcCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIGJ5KSB7XG4gICAgICBieU1hcFtrZXldID0ga2V5O1xuICAgIH1cbiAgICByZXR1cm4gYnlNYXA7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGJ5ID09PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIGJ5O1xuICB9XG4gIHJldHVybiB7W2J5XTogYnl9O1xufVxuZnVuY3Rpb24gaXNNYXRjaChkLCBqLCBieU1hcCkge1xuICBmb3IgKGNvbnN0IGpLZXkgaW4gYnlNYXApIHtcbiAgICBjb25zdCBkS2V5ID0gYnlNYXBbaktleV07XG4gICAgaWYgKGRbZEtleV0gIT09IGpbaktleV0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5mdW5jdGlvbiBpbm5lckpvaW4oaXRlbXNUb0pvaW4sIG9wdGlvbnMpIHtcbiAgY29uc3QgX2lubmVySm9pbiA9IChpdGVtcykgPT4ge1xuICAgIGNvbnN0IGJ5TWFwID0gKG9wdGlvbnMgPT0gbnVsbCA/IHZvaWQgMCA6IG9wdGlvbnMuYnkpID09IG51bGwgPyBhdXRvZGV0ZWN0QnlNYXAoaXRlbXMsIGl0ZW1zVG9Kb2luKSA6IG1ha2VCeU1hcChvcHRpb25zLmJ5KTtcbiAgICBjb25zdCBqb2luZWQgPSBpdGVtcy5mbGF0TWFwKChkKSA9PiB7XG4gICAgICBjb25zdCBtYXRjaGVzID0gaXRlbXNUb0pvaW4uZmlsdGVyKChqKSA9PiBpc01hdGNoKGQsIGosIGJ5TWFwKSk7XG4gICAgICByZXR1cm4gbWF0Y2hlcy5tYXAoKGopID0+ICh7Li4uZCwgLi4uan0pKTtcbiAgICB9KTtcbiAgICByZXR1cm4gam9pbmVkO1xuICB9O1xuICByZXR1cm4gX2lubmVySm9pbjtcbn1cblxuZXhwb3J0IHsgYXV0b2RldGVjdEJ5TWFwLCBpbm5lckpvaW4sIGlzTWF0Y2gsIG1ha2VCeU1hcCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5uZXJKb2luLmpzLm1hcFxuIiwiaW1wb3J0IHsgYXV0b2RldGVjdEJ5TWFwLCBtYWtlQnlNYXAsIGlzTWF0Y2ggfSBmcm9tICcuL2lubmVySm9pbi5qcyc7XG5cbmZ1bmN0aW9uIGxlZnRKb2luKGl0ZW1zVG9Kb2luLCBvcHRpb25zKSB7XG4gIGNvbnN0IF9sZWZ0Sm9pbiA9IChpdGVtcykgPT4ge1xuICAgIGlmICghaXRlbXNUb0pvaW4ubGVuZ3RoKVxuICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIGNvbnN0IGJ5TWFwID0gKG9wdGlvbnMgPT0gbnVsbCA/IHZvaWQgMCA6IG9wdGlvbnMuYnkpID09IG51bGwgPyBhdXRvZGV0ZWN0QnlNYXAoaXRlbXMsIGl0ZW1zVG9Kb2luKSA6IG1ha2VCeU1hcChvcHRpb25zLmJ5KTtcbiAgICBjb25zdCBqb2luT2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzKGl0ZW1zVG9Kb2luWzBdKTtcbiAgICBjb25zdCBqb2luZWQgPSBpdGVtcy5mbGF0TWFwKChkKSA9PiB7XG4gICAgICBjb25zdCBtYXRjaGVzID0gaXRlbXNUb0pvaW4uZmlsdGVyKChqKSA9PiBpc01hdGNoKGQsIGosIGJ5TWFwKSk7XG4gICAgICBpZiAobWF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoZXMubWFwKChqKSA9PiAoey4uLmQsIC4uLmp9KSk7XG4gICAgICB9XG4gICAgICBjb25zdCB1bmRlZmluZWRGaWxsID0gT2JqZWN0LmZyb21FbnRyaWVzKGpvaW5PYmplY3RLZXlzLmZpbHRlcigoa2V5KSA9PiBkW2tleV0gPT0gbnVsbCkubWFwKChrZXkpID0+IFtrZXksIHZvaWQgMF0pKTtcbiAgICAgIHJldHVybiB7Li4uZCwgLi4udW5kZWZpbmVkRmlsbH07XG4gICAgfSk7XG4gICAgcmV0dXJuIGpvaW5lZDtcbiAgfTtcbiAgcmV0dXJuIF9sZWZ0Sm9pbjtcbn1cblxuZXhwb3J0IHsgbGVmdEpvaW4gfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWxlZnRKb2luLmpzLm1hcFxuIiwiZnVuY3Rpb24ga2V5c0Zyb21JdGVtcyhpdGVtcykge1xuICBpZiAoaXRlbXMubGVuZ3RoIDwgMSlcbiAgICByZXR1cm4gW107XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhpdGVtc1swXSk7XG4gIHJldHVybiBrZXlzO1xufVxuXG5leHBvcnQgeyBrZXlzRnJvbUl0ZW1zIH07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1rZXlzRnJvbUl0ZW1zLmpzLm1hcFxuIiwiaW1wb3J0IHsga2V5c0Zyb21JdGVtcyB9IGZyb20gJy4uL2hlbHBlcnMva2V5c0Zyb21JdGVtcy5qcyc7XG5cbmZ1bmN0aW9uIGV2ZXJ5dGhpbmcoKSB7XG4gIHJldHVybiAoaXRlbXMpID0+IHtcbiAgICBjb25zdCBrZXlzID0ga2V5c0Zyb21JdGVtcyhpdGVtcyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG59XG5cbmV4cG9ydCB7IGV2ZXJ5dGhpbmcgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWV2ZXJ5dGhpbmcuanMubWFwXG4iLCJpbXBvcnQgeyBzaW5nbGVPckFycmF5IH0gZnJvbSAnLi9oZWxwZXJzL3NpbmdsZU9yQXJyYXkuanMnO1xuaW1wb3J0IHsgZXZlcnl0aGluZyB9IGZyb20gJy4vc2VsZWN0b3JzL2V2ZXJ5dGhpbmcuanMnO1xuXG5mdW5jdGlvbiBwcm9jZXNzU2VsZWN0b3JzKGl0ZW1zLCBzZWxlY3RLZXlzKSB7XG4gIGxldCBwcm9jZXNzZWRTZWxlY3RLZXlzID0gW107XG4gIGZvciAoY29uc3Qga2V5SW5wdXQgb2Ygc2luZ2xlT3JBcnJheShzZWxlY3RLZXlzKSkge1xuICAgIGlmICh0eXBlb2Yga2V5SW5wdXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcHJvY2Vzc2VkU2VsZWN0S2V5cy5wdXNoKC4uLmtleUlucHV0KGl0ZW1zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2Nlc3NlZFNlbGVjdEtleXMucHVzaChrZXlJbnB1dCk7XG4gICAgfVxuICB9XG4gIGlmIChwcm9jZXNzZWRTZWxlY3RLZXlzLmxlbmd0aCAmJiBwcm9jZXNzZWRTZWxlY3RLZXlzWzBdWzBdID09PSBcIi1cIikge1xuICAgIHByb2Nlc3NlZFNlbGVjdEtleXMgPSBbLi4uZXZlcnl0aGluZygpKGl0ZW1zKSwgLi4ucHJvY2Vzc2VkU2VsZWN0S2V5c107XG4gIH1cbiAgY29uc3QgbmVnYXRpb25NYXAgPSB7fTtcbiAgY29uc3Qga2V5c1dpdGhvdXROZWdhdGlvbnMgPSBbXTtcbiAgZm9yIChsZXQgayA9IHByb2Nlc3NlZFNlbGVjdEtleXMubGVuZ3RoIC0gMTsgayA+PSAwOyBrLS0pIHtcbiAgICBjb25zdCBrZXkgPSBwcm9jZXNzZWRTZWxlY3RLZXlzW2tdO1xuICAgIGlmIChrZXlbMF0gPT09IFwiLVwiKSB7XG4gICAgICBuZWdhdGlvbk1hcFtrZXkuc3Vic3RyaW5nKDEpXSA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKG5lZ2F0aW9uTWFwW2tleV0pIHtcbiAgICAgIG5lZ2F0aW9uTWFwW2tleV0gPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBrZXlzV2l0aG91dE5lZ2F0aW9ucy51bnNoaWZ0KGtleSk7XG4gIH1cbiAgcHJvY2Vzc2VkU2VsZWN0S2V5cyA9IEFycmF5LmZyb20obmV3IFNldChrZXlzV2l0aG91dE5lZ2F0aW9ucykpO1xuICByZXR1cm4gcHJvY2Vzc2VkU2VsZWN0S2V5cztcbn1cbmZ1bmN0aW9uIHNlbGVjdChzZWxlY3RLZXlzKSB7XG4gIGNvbnN0IF9zZWxlY3QgPSAoaXRlbXMpID0+IHtcbiAgICBsZXQgcHJvY2Vzc2VkU2VsZWN0S2V5cyA9IHByb2Nlc3NTZWxlY3RvcnMoaXRlbXMsIHNlbGVjdEtleXMpO1xuICAgIGlmICghcHJvY2Vzc2VkU2VsZWN0S2V5cy5sZW5ndGgpXG4gICAgICByZXR1cm4gaXRlbXM7XG4gICAgcmV0dXJuIGl0ZW1zLm1hcCgoZCkgPT4ge1xuICAgICAgY29uc3QgbWFwcGVkID0ge307XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBwcm9jZXNzZWRTZWxlY3RLZXlzKSB7XG4gICAgICAgIG1hcHBlZFtrZXldID0gZFtrZXldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hcHBlZDtcbiAgICB9KTtcbiAgfTtcbiAgcmV0dXJuIF9zZWxlY3Q7XG59XG5cbmV4cG9ydCB7IHByb2Nlc3NTZWxlY3RvcnMsIHNlbGVjdCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2VsZWN0LmpzLm1hcFxuIiwiaW1wb3J0IHsgcHJvY2Vzc1NlbGVjdG9ycyB9IGZyb20gJy4vc2VsZWN0LmpzJztcblxuZnVuY3Rpb24gcGl2b3RMb25nZXIob3B0aW9ucykge1xuICBjb25zdCBfcGl2b3RMb25nZXIgPSAoaXRlbXMpID0+IHtcbiAgICB2YXIgX2E7XG4gICAgY29uc3Qge25hbWVzVG8sIHZhbHVlc1RvLCBuYW1lc1NlcCA9IFwiX1wifSA9IG9wdGlvbnM7XG4gICAgY29uc3QgY29scyA9IChfYSA9IG9wdGlvbnMuY29scykgIT0gbnVsbCA/IF9hIDogW107XG4gICAgY29uc3QgY29sc0tleXMgPSBwcm9jZXNzU2VsZWN0b3JzKGl0ZW1zLCBjb2xzKTtcbiAgICBjb25zdCBuYW1lc1RvS2V5cyA9IEFycmF5LmlzQXJyYXkobmFtZXNUbykgPyBuYW1lc1RvIDogW25hbWVzVG9dO1xuICAgIGNvbnN0IHZhbHVlc1RvS2V5cyA9IEFycmF5LmlzQXJyYXkodmFsdWVzVG8pID8gdmFsdWVzVG8gOiBbdmFsdWVzVG9dO1xuICAgIGNvbnN0IGhhc011bHRpcGxlTmFtZXNUbyA9IG5hbWVzVG9LZXlzLmxlbmd0aCA+IDE7XG4gICAgY29uc3QgaGFzTXVsdGlwbGVWYWx1ZXNUbyA9IHZhbHVlc1RvS2V5cy5sZW5ndGggPiAxO1xuICAgIGNvbnN0IGxvbmdlciA9IFtdO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgY29uc3QgcmVtYWluaW5nS2V5cyA9IE9iamVjdC5rZXlzKGl0ZW0pLmZpbHRlcigoa2V5KSA9PiAhY29sc0tleXMuaW5jbHVkZXMoa2V5KSk7XG4gICAgICBjb25zdCBiYXNlT2JqID0ge307XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiByZW1haW5pbmdLZXlzKSB7XG4gICAgICAgIGJhc2VPYmpba2V5XSA9IGl0ZW1ba2V5XTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5hbWVWYWx1ZUtleXNXaXRob3V0VmFsdWVQcmVmaXggPSBoYXNNdWx0aXBsZVZhbHVlc1RvID8gQXJyYXkuZnJvbShuZXcgU2V0KGNvbHNLZXlzLm1hcCgoa2V5KSA9PiBrZXkuc3Vic3RyaW5nKGtleS5pbmRleE9mKG5hbWVzU2VwKSArIDEpKSkpIDogY29sc0tleXM7XG4gICAgICBmb3IgKGNvbnN0IG5hbWVWYWx1ZSBvZiBuYW1lVmFsdWVLZXlzV2l0aG91dFZhbHVlUHJlZml4KSB7XG4gICAgICAgIGNvbnN0IGVudHJ5T2JqID0gey4uLmJhc2VPYmp9O1xuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlS2V5IG9mIHZhbHVlc1RvS2V5cykge1xuICAgICAgICAgIGNvbnN0IGl0ZW1LZXkgPSBoYXNNdWx0aXBsZVZhbHVlc1RvID8gYCR7dmFsdWVLZXl9JHtuYW1lc1NlcH0ke25hbWVWYWx1ZX1gIDogbmFtZVZhbHVlO1xuICAgICAgICAgIGNvbnN0IG5hbWVWYWx1ZVBhcnRzID0gaGFzTXVsdGlwbGVOYW1lc1RvID8gbmFtZVZhbHVlLnNwbGl0KG5hbWVzU2VwKSA6IFtuYW1lVmFsdWVdO1xuICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICBmb3IgKGNvbnN0IG5hbWVLZXkgb2YgbmFtZXNUb0tleXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWVWYWx1ZVBhcnQgPSBuYW1lVmFsdWVQYXJ0c1tpKytdO1xuICAgICAgICAgICAgZW50cnlPYmpbbmFtZUtleV0gPSBuYW1lVmFsdWVQYXJ0O1xuICAgICAgICAgICAgZW50cnlPYmpbdmFsdWVLZXldID0gaXRlbVtpdGVtS2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbG9uZ2VyLnB1c2goZW50cnlPYmopO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9uZ2VyO1xuICB9O1xuICByZXR1cm4gX3Bpdm90TG9uZ2VyO1xufVxuXG5leHBvcnQgeyBwaXZvdExvbmdlciB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cGl2b3RMb25nZXIuanMubWFwXG4iLCJpbXBvcnQge1xuICBBcHBsaWVkUHJvbXB0cyxcbiAgQ29udGV4dCxcbiAgb25EcmlsbERvd25GdW5jdGlvbixcbiAgUmVzcG9uc2VEYXRhLFxuICBUQ29udGV4dFxufSBmcm9tICdAaW5jb3J0YS1vcmcvY29tcG9uZW50LXNkayc7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgdGlkeSwgcGl2b3RMb25nZXIsIG11dGF0ZSxmdWxsSm9pbixsZWZ0Sm9pbiwgZ3JvdXBCeSwgc3VtbWFyaXplLCBzdW0sIGZpbHRlciwgbGFzdCB9IGZyb20gJ0B0aWR5anMvdGlkeSdcbmltcG9ydCAnLi9BcHAuY3NzJztcblxuICBcbmludGVyZmFjZSBQcm9wcyB7XG4gIGNvbnRleHQ6IENvbnRleHQ8VENvbnRleHQ+O1xuICBwcm9tcHRzOiBBcHBsaWVkUHJvbXB0cztcbiAgZGF0YTogUmVzcG9uc2VEYXRhO1xuICBkcmlsbERvd246IG9uRHJpbGxEb3duRnVuY3Rpb247XG59XG5cbmNvbnN0IEZpblN0YXRlbWVudCA9ICh7IGNvbnRleHQsIHByb21wdHMsIGRhdGEsIGRyaWxsRG93biB9OiBQcm9wcykgPT4ge1xuICBjb25zb2xlLmxvZyhkYXRhKVxuICBcbiAgLyogR2V0cyBkaW1lbnRpb25zIGFuZCBtZWFzdXJlcyBjb2x1bW5zICovXG4gIGNvbnN0IGRpbXMgPSBkYXRhLnJvd0hlYWRlcnM/Lm1hcChjZWxsID0+IHtcbiAgICByZXR1cm4geyBmaWVsZDogY2VsbC5pZCwgaGVhZGVyOiBjZWxsLmxhYmVsLCB0eXBlOiAnZGltZW50aW9uJyB9O1xuICB9KSA/PyBbXTtcbiAgY29uc3QgbWFhc3VyZXMgPSBkYXRhLm1lYXN1cmVIZWFkZXJzLm1hcChjZWxsID0+IHtcbiAgcmV0dXJuIHsgZmllbGQ6IGNlbGwuaWQsIGhlYWRlcjogY2VsbC5sYWJlbCwgdHlwZTogJ21lYXN1cmUnIH07XG4gIH0pO1xuICBjb25zdCBjb2xzID0gZGltcy5jb25jYXQobWFhc3VyZXMpO1xuICAvKiBvbmx5IGdldCB0aGUgaGVhZGVyIG5hbWUgKi9cbiAgbGV0IGNvbHNOYW1lID0gY29scy5tYXAoYSA9PiBhLmhlYWRlcik7XG4gIGxldCBtYWFzdXJlTmFtZSA9IG1hYXN1cmVzLm1hcChhID0+IGEuaGVhZGVyKTtcblxuICAvKiBnZXQgZGF0YSBmcm9tIEluY29ydGEgYW5kIHB1dCBpbnRvIGFycmF5Ki9cbiAgbGV0IF9yYXdEYXRhID0gZGF0YS5kYXRhLm1hcCgoY29sOiBhbnkpID0+IHtcbiAgICBsZXQgY29sc05hbWUgPSBjb2w7XG4gICAgcmV0dXJuIGNvbHNOYW1lfSk7XG4gXG4gIC8qIGFkanVzdCB0aGUga2V5IG5hbWUgd2l0aCBjb2xzTmFtZSAqL1xuICBjb25zdCByYXdfaW5wdXQ6IGFueVtdID0gW11cbiAgX3Jhd0RhdGEubWFwKGZ1bmN0aW9uKGQpe1xuICAgIGxldCByID0ge31cbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgY29sc05hbWUubGVuZ3RoOyBpKyspeyBcbiAgICAgIHJbY29sc05hbWVbaV1dID0gZFtpXS5mb3JtYXR0ZWR9XG4gICAgcmF3X2lucHV0LnB1c2gocikgLy8gYXBwZW5kIGFycmF5XG4gICAgfSlcblxuICAvKiB1bnBpdmlvdCB0aGUgY29sdW1uIGludG86IHBlcmlvZCwgaXRlbSwgYW1vdW50ICovXG4gIGxldCBkdCA9IHRpZHkoXG4gICAgICByYXdfaW5wdXQsXG4gICAgICBwaXZvdExvbmdlcih7XG4gICAgICAgIGNvbHM6IG1hYXN1cmVOYW1lLFxuICAgICAgICBuYW1lc1RvOiAnaXRlbScsXG4gICAgICAgIHZhbHVlc1RvOiAnYW1vdW50JyxcbiAgICAgIH0pXG4gICAgKTtcblxuICAvKiBjaGFuZ2UgZGF0YSB0eXBlIHRvIGZsb2F0IGZvciBhZ3JlZ2F0aW9uICovXG4gIGR0Lm1hcChmdW5jdGlvbihkKXtcbiAgICBkLlBlcmlvZCA9IHBhcnNlRmxvYXQoZC5QZXJpb2QpO1xuICAgIGQuYW1vdW50ID0gcGFyc2VGbG9hdChkLmFtb3VudCk7fSlcbiAgXG4gIC8qIGFncmVnYXRpb24gYnkgcGVyaW9kIGFuZCBpdGVtICovXG4gIGxldCBuZXdfZHQgPSB0aWR5KFxuICAgIGR0LFxuICAgIGdyb3VwQnkoWydQZXJpb2QnLCAnaXRlbSddLCBbc3VtbWFyaXplKHsgdG90YWw6IHN1bSgnYW1vdW50JykgfSldKSlcbiAgXG4gIC8vIGZpeGVkIHRoZSBpbnB1dCBjdXJyZW50IHllYXJcbiAgbGV0IGN1cnIgPSAyMDIyXG4gIGxldCBjdXJyZGF0YSA9IHRpZHkobmV3X2R0LCBmaWx0ZXIoKGQpID0+IGQuUGVyaW9kID09PSBjdXJyKSlcbiAgbGV0IGxhc3RkYXRhID0gdGlkeShuZXdfZHQsIGZpbHRlcigoZCkgPT4gZC5QZXJpb2QgPT09IGN1cnItMSkpXG4gIC8vIGNoYW5nZSB0aGUga2V5IG5hbWUgb2YgbGFzdCB5ZWFyIGRhdGFcbiAgbGV0IGxhc3R5cmRhdGEgPSBsYXN0ZGF0YS5tYXAoKHtcbiAgICB0b3RhbDogdG90YWxsYXN0LFxuICAgIC4uLnJlc3RcbiAgfSkgPT4gKHtcbiAgICB0b3RhbGxhc3QsXG4gICAgLi4ucmVzdFxuICB9KSk7XG4gIFxuICAvLyBsZWZ0IGpvaW4gdHdvIHllYXJzJyBkYXRhIFxuICBsZXQgdHdvZGF0YSA9IHRpZHkoY3VycmRhdGEsXG4gICAgICBsZWZ0Sm9pbihsYXN0eXJkYXRhLCB7IGJ5OiAnaXRlbScgfSkpXG5cbiAgLy8gYWRkIHBlcmNlbnRhZ2UgY2hhbmdlIHJhdGUgYmV0d2VlbiB0d28geWVhcnNcbiAgZnVuY3Rpb24gZm9ybWF0QXNQZXJjZW50KG51bTpudW1iZXIpIHtcbiAgICAgIHJldHVybiBgJHtNYXRoLmZsb29yKG51bSoxMDApfSVgO31cblxuICBsZXQgcmF0aW9fZHQgPSB0aWR5KHR3b2RhdGEsIG11dGF0ZSh7XG4gICAgcmF0ZTogKGQ6IGFueSkgPT4gZm9ybWF0QXNQZXJjZW50KChkLnRvdGFsIC0gZC50b3RhbGxhc3QpL2QudG90YWxsYXN0KSxcbiAgICAvLyBub24tbnVsbCBhc3NlcnRpb24gb3BlcmF0b3IgdG8gZW5zdXJlIGl0IGlzIG51bWJlciB0eXBlXG4gICAgY3Vycl9yYXRpbzogKGQ6IGFueSk9PiBmb3JtYXRBc1BlcmNlbnQoZC50b3RhbC90d29kYXRhLmF0KDApPy50b3RhbCEpLFxuICAgIGxhc3RfcmF0aW86IChkOiBhbnkpPT4gZm9ybWF0QXNQZXJjZW50KGQudG90YWxsYXN0L3R3b2RhdGEuYXQoMCk/LnRvdGFsbGFzdCEpXG4gIH0pKVxuICBcbmNvbnNvbGUubG9nKFwidGVzdDAyMjJcIik7XG5jb25zb2xlLmxvZyhyYXRpb19kdCk7XG5cblxuICBjb25zdCBEaXNwbGF5RGF0YT1yYXRpb19kdC5tYXAoXG4gICAgKGluZm8pPT57XG4gICAgICAgIHJldHVybihcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8dGQ+e2luZm8uaXRlbX08L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD57aW5mby50b3RhbH08L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD57aW5mby5jdXJyX3JhdGlvfTwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPntpbmZvLnRvdGFsbGFzdH08L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD57aW5mby5sYXN0X3JhdGlvfTwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPntpbmZvLnJhdGV9PC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIClcbiAgICB9XG4gIClcblxuXG4gIHJldHVybiAoXG4gICAgPGRpdj48aDI+MjAyMiBJbmNvbWUgU3RhdGVtZW50PC9oMj5cbiAgICAgICAgICAgIDx0YWJsZSBpZD1cImN1c3RvbWVyc1wiPlxuICAgICAgICAgICAgICAgIDx0aGVhZD5cbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuXG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgPHRoPkl0ZW08L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGg+Q3VycmVudCB5ZWFyPC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoPkN1cnJlbnQgcmF0aW88L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGg+TGFzdCB5ZWFyPC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoPkxhc3QgcmF0aW88L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGg+UGVyY2VudGFnZSBDaGFuZ2U8L3RoPlxuXG5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cblxuICAgICAgICAgICAgICAgIDwvdGhlYWQ+XG5cbiAgICAgICAgICAgICAgICA8dGJvZHk+ICAgICAgICAgIFxuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAge0Rpc3BsYXlEYXRhfVxuXG4gICAgICAgICAgICAgICAgPC90Ym9keT5cblxuICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgXG4gICAgICA8L2Rpdj5cbiAgICApO1xuIFxufTtcblxuZXhwb3J0IGRlZmF1bHQgRmluU3RhdGVtZW50O1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7XG4gIHVzZUNvbnRleHQsXG4gIExvYWRpbmdPdmVybGF5LFxuICBFcnJvck92ZXJsYXksXG4gIHVzZVByb21wdHMsXG4gIHVzZVF1ZXJ5XG59IGZyb20gJ0BpbmNvcnRhLW9yZy9jb21wb25lbnQtc2RrJztcbmltcG9ydCBGaW5TdGF0ZW1lbnRDb21wb25lbnQgZnJvbSAnLi9GaW5TdGF0ZW1lbnQnO1xuaW1wb3J0ICcuL3N0eWxlcy5sZXNzJztcblxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xuICBjb25zdCB7IHByb21wdHMsIGRyaWxsRG93biB9ID0gdXNlUHJvbXB0cygpO1xuICBjb25zdCB7IGRhdGEsIGNvbnRleHQsIGlzTG9hZGluZywgaXNFcnJvciwgZXJyb3IgfSA9IHVzZVF1ZXJ5KHVzZUNvbnRleHQoKSwgcHJvbXB0cyk7XG4gIHJldHVybiAoXG4gICAgPEVycm9yT3ZlcmxheSBpc0Vycm9yPXtpc0Vycm9yfSBlcnJvcj17ZXJyb3J9PlxuICAgICAgPExvYWRpbmdPdmVybGF5IGlzTG9hZGluZz17aXNMb2FkaW5nfSBkYXRhPXtkYXRhfT5cbiAgICAgICAge2NvbnRleHQgJiYgZGF0YSA/IChcbiAgICAgICAgICA8RmluU3RhdGVtZW50Q29tcG9uZW50IGRhdGE9e2RhdGF9IGNvbnRleHQ9e2NvbnRleHR9IHByb21wdHM9e3Byb21wdHN9IGRyaWxsRG93bj17ZHJpbGxEb3dufSAvPlxuICAgICAgICApIDogbnVsbH1cbiAgICAgIDwvTG9hZGluZ092ZXJsYXk+XG4gICAgPC9FcnJvck92ZXJsYXk+XG4gICk7XG59O1xuIl0sIm5hbWVzIjpbImluZGV4Iiwia2V5IiwiaWRlbnRpdHkiLCJ2YWx1ZXMiLCJrZXlvZiIsImdyb3VwIiwiX2EiLCJjb2xzTmFtZSIsIlJlYWN0IiwiRmluU3RhdGVtZW50Q29tcG9uZW50Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUEsTUFBSTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0YsS0FBSSxZQUFPLGtCQUFQLFlBQXdCLENBQUU7QUNWOUIsV0FBUyxLQUFLLFVBQVUsS0FBSztBQUMzQixRQUFJLE9BQU8sVUFBVSxZQUFZO0FBQy9CLFlBQU0sSUFBSSxNQUFNLDBEQUEwRDtBQUFBLElBQzNFO0FBQ0QsUUFBSSxTQUFTO0FBQ2IsZUFBVyxNQUFNLEtBQUs7QUFDcEIsVUFBSSxJQUFJO0FBQ04saUJBQVMsR0FBRyxNQUFNO0FBQUEsTUFDbkI7QUFBQSxJQUNGO0FBQ0QsV0FBTztBQUFBLEVBQ1Q7QUNYQSxXQUFTLE9BQU8sVUFBVTtBQUN4QixVQUFNLFVBQVUsQ0FBQyxVQUFVLE1BQU0sT0FBTyxRQUFRO0FBQ2hELFdBQU87QUFBQSxFQUNUO0FDSEEsV0FBUyxjQUFjLEdBQUc7QUFDeEIsV0FBTyxLQUFLLE9BQU8sQ0FBQSxJQUFL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
//# sourceURL=render.js
