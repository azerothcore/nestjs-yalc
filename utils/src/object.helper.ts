interface IIsObject {
  (item: any): boolean;
}

interface IObject {
  [key: string]: any;
}

interface IDeepMerge {
  (target: IObject, ...sources: Array<IObject>): IObject;
}

/**
 * @description Method to check if an item is an object. Date and Function are considered
 * an object, so if you need to exclude those, please update the method accordingly.
 * @param val - The item that needs to be checked
 * @return {Boolean} Whether or not @item is an object
 */
export const isObject: IIsObject = (val: any): val is Record<string, any> => {
  return val === Object(val) && !Array.isArray(val);
};

/**
 * @description Method to strictly check if an item is an object. Date and Function are not considered
 * @param val - The item that needs to be checked
 * @returns
 */
export function isObjectStrict(val: any): val is Record<string, any> {
  return (
    isObject(val) &&
    !Array.isArray(val) &&
    !(val instanceof Date) &&
    !(typeof val === 'function')
  );
}

/**
 * @description Method to perform a deep merge of objects
 * @param {Object} target - The targeted object that needs to be merged with the supplied @sources
 * @param {Array<Object>} sources - The source(s) that will be used to update the @target object
 * @return {Object} The final merged object
 */
export const deepMerge: IDeepMerge = (
  target: IObject,
  ...sources: Array<IObject>
): IObject => {
  // return the target if no sources passed
  if (!sources.length) {
    return target;
  }

  const result: IObject = target;

  if (isObject(result)) {
    const len: number = sources.length;

    for (let i = 0; i < len; i += 1) {
      const elm: any = sources[i];

      if (isObject(elm)) {
        for (const key in elm) {
          if (Object.prototype.hasOwnProperty.call(elm, key)) {
            if (isObject(elm[key])) {
              if (!result[key] || !isObject(result[key])) {
                result[key] = {};
              }
              deepMerge(result[key], elm[key]);
            } else {
              if (Array.isArray(result[key]) && Array.isArray(elm[key])) {
                // concatenate the two arrays and remove any duplicate primitive values
                result[key] = Array.from(new Set(result[key].concat(elm[key])));
              } else {
                result[key] = elm[key];
              }
            }
          }
        }
      }
    }
  }

  return result;
};

/**
 * Utils to patch a nested property on an object
 * specifying a dot-separated path.
 * If the parent properties do not exist, they will be created
 *
 * @param obj the object to patch
 * @param path the path of the property to set, e.g: "foo.bar.baz"
 * @param value the value to set
 * @returns the patched object
 */
export function objectSetProp(
  obj: Record<any, any>,
  path: string,
  value: any,
): Record<any, any> {
  let schema = obj; // a moving reference to internal objects within obj
  const pList = path.split('.');
  const len = pList.length;
  for (let i = 0; i < len - 1; i++) {
    const elem = pList[i];
    if (!schema[elem]) schema[elem] = {};
    schema = schema[elem];
  }

  schema[pList[len - 1]] = value;

  return obj;
}

export function objectsHaveSameKeys(...objects: any[]) {
  const allKeys = objects.reduce(
    (keys, object) => keys.concat(Object.keys(object)),
    [],
  );
  const union = new Set(allKeys);
  return objects.every((object) => union.size === Object.keys(object).length);
}

let count: number = 1;
const idMap: WeakMap<Record<string, unknown> | Array<unknown>, number> =
  new WeakMap<Record<string, unknown> | Array<unknown>, number>();
/**
 * @description Method to get the object id (unique identifier) of an object
 */
export function getObjectId(
  object: Record<string, unknown> | Array<unknown>,
): number {
  const objectId: number | undefined = idMap.get(object);
  if (objectId === undefined) {
    count += 1;
    idMap.set(object, count);

    return count;
  }

  return objectId;
}
