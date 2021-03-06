/*!
 * Copyright (C) 2018-2020 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Class from '@singleware/class';
import * as Mapping from '@singleware/mapping';
import * as Path from '@singleware/path';

import * as Types from '../types';

import { Query } from './query';

/**
 * Common driver, filters class.
 */
@Class.Describe()
export class Filters extends Class.Null {
  /**
   * Magic query prefix.
   */
  @Class.Private()
  private static QueryPrefix = 'query';

  /**
   * Magic fields prefix.
   */
  @Class.Private()
  private static FieldsPrefix = 'fields';

  /**
   * Magic pre-match prefix.
   */
  @Class.Private()
  private static PreMatchPrefix = 'pre';

  /**
   * Magic post-match prefix.
   */
  @Class.Private()
  private static PostMatchPrefix = 'post';

  /**
   * Magic sort prefix.
   */
  @Class.Private()
  private static SortPrefix = 'sort';

  /**
   * Magic limit prefix.
   */
  @Class.Private()
  private static LimitPrefix = 'limit';

  /**
   * Packs the specified list of viewed fields into a parameterized array of viewed fields.
   * @param fields Viewed fields.
   * @returns Returns the parameterized array of viewed fields.
   */
  @Class.Private()
  private static packViewedFields(fields: string[]): (string | number)[] {
    return [this.FieldsPrefix, fields.length, ...new Set(fields).values()];
  }

  /**
   * Unpacks the parameterized array of viewed fields into a list of viewed fields.
   * @param array Parameterized array of viewed fields.
   * @returns Returns the list of viewed fields or undefined when there no viewed fields.
   * @throws Throws an error when there are invalid serialized data.
   */
  @Class.Private()
  private static unpackViewedFields(array: string[]): string[] {
    if (this.FieldsPrefix !== array.pop()) {
      throw new Error(`Invalid magic prefix for the given array of viewed fields.`);
    } else {
      const length = parseInt(array.pop()!);
      if (array.length < length) {
        throw new Error(`Invalid size for the given array of viewed fields.`);
      } else {
        const fields = [];
        for (let i = 0; i < length; ++i) {
          fields.push(array.pop()!);
        }
        return fields;
      }
    }
  }

  /**
   * Pack the specified value based on the given column.
   * @param column Column schema.
   * @param value Value to be packed.
   * @returns Returns the packed value.
   */
  @Class.Private()
  private static packValue<T>(column: Mapping.Columns.Any, value: any): string {
    if (value instanceof Date) {
      return value.getTime().toString();
    } else if (value === true) {
      return '1';
    } else if (value === false || value === null) {
      return '0';
    }
    return value.toString();
  }

  /**
   * Pack a new operation in the given operations list based on the specified parameters.
   * @param operations Operations list.
   * @param column Column schema.
   * @param path Column path.
   * @param operator Operator type.
   * @param value Operation value.
   */
  @Class.Private()
  private static packOperation(
    operations: (string | number)[],
    column: Mapping.Columns.Any,
    path: string,
    operator: Mapping.Filters.Operator,
    value: any
  ): void {
    operations.push(path, operator);
    switch (operator) {
      case Types.Operator.LessThan:
      case Types.Operator.LessThanOrEqual:
      case Types.Operator.Equal:
      case Types.Operator.NotEqual:
      case Types.Operator.GreaterThanOrEqual:
      case Types.Operator.GreaterThan:
        operations.push(encodeURIComponent(this.packValue(column, value)));
        break;
      case Types.Operator.Between:
      case Types.Operator.Contain:
      case Types.Operator.NotContain:
        if (!(value instanceof Array)) {
          throw new Error(`Match value for the given path '${path}' should be an Array object.`);
        }
        operations.push(value.length, ...value.map((item) => encodeURIComponent(this.packValue(column, item))));
        break;
      case Types.Operator.RegExp:
        if (!(value instanceof RegExp)) {
          throw new Error(`Match value for the given path '${path}' should be a RegExp object.`);
        }
        operations.push(encodeURIComponent(value.source));
        operations.push(encodeURIComponent(value.flags));
        break;
      default:
        throw new TypeError(`Invalid operator '${operator}' for the given path '${path}'.`);
    }
  }

  /**
   * Pack the specified matching rules into a parameterized array of matching rules.
   * @param model Model type.
   * @param match Matching rules.
   * @returns Returns the parameterized array of matching rules.
   * @throws Throws an error when there are invalid matching operator codes.
   */
  @Class.Private()
  private static packMatchRules(prefix: string, model: Types.Model, match: Types.Match | Types.Match[]): (number | string)[] {
    const rulesList = [];
    let rulesCounter = 0;
    for (const expression of match instanceof Array ? match : [match]) {
      const operationsList = <(string | number)[]>[];
      let operationsCounter = 0;
      for (const path in expression) {
        const columns = Mapping.Helper.tryPathColumns(model, path);
        if (!columns) {
          throw new Error(`Invalid matching path '${path}' for the given model.`);
        } else {
          operationsCounter++;
          const operation = expression[path];
          const schema = columns[columns.length - 1];
          if (Mapping.Filters.Helper.isOperation(operation)) {
            this.packOperation(operationsList, schema, path, operation.operator, operation.value);
          } else {
            const entry = Object.entries(operation)[0];
            this.packOperation(operationsList, schema, path, <Mapping.Filters.Operator>entry[0], entry[1]);
          }
        }
      }
      if (operationsCounter > 0) {
        rulesList.push(operationsCounter, ...operationsList);
        rulesCounter++;
      }
    }
    return [prefix, rulesCounter, ...rulesList];
  }

  /**
   * Unpack the specified value based on the given column.
   * @param column Column schema.
   * @param value Value.
   * @returns Returns the unpacked value.
   */
  @Class.Private()
  private static unpackValue(column: Readonly<Mapping.Columns.Any>, value: string): Date | number | boolean | string | null {
    if (column.formats.includes(Mapping.Types.Format.Date)) {
      return new Date(parseInt(value));
    } else if (column.formats.includes(Mapping.Types.Format.Decimal) || column.formats.includes(Mapping.Types.Format.Number)) {
      return parseFloat(value);
    } else if (column.formats.includes(Mapping.Types.Format.Integer) || column.formats.includes(Mapping.Types.Format.Timestamp)) {
      return parseInt(value);
    } else if (column.formats.includes(Mapping.Types.Format.Boolean) && (value === '1' || value === '0')) {
      return value === '1';
    } else if (column.formats.includes(Mapping.Types.Format.Null) && value === '0') {
      return null;
    }
    return value;
  }

  /**
   * Unpack a new operation in the given operations map based on the specified parameters.
   * @param operations Operations map.
   * @param column Column schema.
   * @param path Column path.
   * @param operator Operator type.
   * @param array Parameterized array.
   */
  @Class.Private()
  private static unpackOperation(
    operations: Types.Match,
    column: Mapping.Columns.Any,
    path: string,
    operator: string,
    array: string[]
  ): void {
    switch (operator) {
      case Types.Operator.LessThan:
      case Types.Operator.LessThanOrEqual:
      case Types.Operator.Equal:
      case Types.Operator.NotEqual:
      case Types.Operator.GreaterThanOrEqual:
      case Types.Operator.GreaterThan:
        operations[path] = {
          operator: operator,
          value: this.unpackValue(column, decodeURIComponent(array.pop()!))
        };
        break;
      case Types.Operator.Between:
      case Types.Operator.Contain:
      case Types.Operator.NotContain:
        const values = [];
        for (let total = parseInt(array.pop()!); total > 0; --total) {
          values.push(this.unpackValue(column, decodeURIComponent(array.pop()!)));
        }
        operations[path] = {
          operator: operator,
          value: values
        };
        break;
      case Types.Operator.RegExp:
        const regexp = decodeURIComponent(array.pop()!);
        const flags = decodeURIComponent(array.pop()!);
        operations[path] = {
          operator: operator,
          value: new RegExp(regexp, flags)
        };
        break;
      default:
        throw new TypeError(`Invalid operator '${operator}' for the given path '${path}'.`);
    }
  }

  /**
   * Unpack the parameterized array of matching rules into the matching rules.
   * @param model Model type.
   * @param array Parameterized array of matching rules.
   * @returns Returns the generated matching rules or undefined when there's no rules.
   * @throws Throws an error when there are invalid serialized data.
   */
  @Class.Private()
  private static unpackMatchRules(prefix: string, model: Types.Model, array: string[]): Types.Match | Types.Match[] | undefined {
    if (prefix !== array.pop()) {
      throw new Error(`Invalid magic prefix for the given array of matching lists.`);
    } else {
      const rulesList = [];
      for (let rulesCounter = parseInt(array.pop()!); rulesCounter > 0; --rulesCounter) {
        const operationsMap = <Types.Match>{};
        for (let operationsCounter = parseInt(array.pop()!); operationsCounter > 0; --operationsCounter) {
          const path = array.pop()!;
          const columns = Mapping.Helper.tryPathColumns(model, path);
          if (!columns) {
            throw new Error(`Invalid matching path '${path}' for the given model.`);
          } else {
            const operator = array.pop()!;
            const schema = columns[columns.length - 1];
            this.unpackOperation(operationsMap, schema, path, operator, array);
          }
        }
        rulesList.push(operationsMap);
      }
      if (rulesList.length > 0) {
        return rulesList.length === 1 ? rulesList[0] : rulesList;
      }
      return void 0;
    }
  }

  /**
   * Packs the specified sorting fields into a parameterized array of sorting fields.
   * @param model Model type.
   * @param sort Sorting fields.
   * @returns Returns the parameterized array of sorting fields.
   */
  @Class.Private()
  private static packSort(model: Types.Model, sort: Types.Sort): (number | string)[] {
    const fields = [];
    for (const path in sort) {
      if (!Mapping.Helper.tryPathColumns(model, path)) {
        throw new Error(`Invalid sorting path '${path}' for the given model.`);
      }
      fields.push(path, sort[path]);
    }
    return [this.SortPrefix, fields.length / 2, ...fields];
  }

  /**
   * Unpacks the parameterized array of sorting fields into the sorting fields.
   * @param model Model type.
   * @param array Parameterized array of sorting fields.
   * @returns Returns the generated sorting fields.
   * @throws Throws an error when there are invalid serialized data.
   */
  @Class.Private()
  private static unpackSort(model: Types.Model, array: string[]): Types.Sort {
    if (this.SortPrefix !== array.pop()) {
      throw new Error(`Invalid magic prefix for the given array of sorting list.`);
    } else {
      const fields = <Types.Sort>{};
      for (let length = parseInt(array.pop()!); length > 0; --length) {
        const path = array.pop()!;
        const order = array.pop()!;
        if (!Mapping.Helper.tryPathColumns(model, path)) {
          throw new Error(`Invalid sorting path '${path}' for the given model.`);
        } else {
          switch (order) {
            case Types.Order.Ascending:
            case Types.Order.Descending:
              fields[path] = order;
              break;
            default:
              throw new Error(`Invalid sorting order ${order} for the given path '${path}'..`);
          }
        }
      }
      return fields;
    }
  }

  /**
   * Packs the specified limit entity into a parameterized array of limits.
   * @param limit Limit entity.
   * @returns Returns the parameterized array of limits.
   */
  @Class.Private()
  private static packLimit(limit: Types.Limit): (string | number)[] {
    return [this.LimitPrefix, limit.start || 0, limit.count || 0];
  }

  /**
   * Unpacks the parameterized array of limits into the limit entity.
   * @param array Parameterized array of limits.
   * @returns Returns the generated limit entity.
   * @throws Throws an error when there are invalid serialized data.
   */
  @Class.Private()
  private static unpackLimit(array: string[]): Types.Limit {
    if (this.LimitPrefix !== array.pop()) {
      throw new Error(`Invalid magic prefix for the given array of limits.`);
    } else {
      return {
        start: parseInt(array.pop()!) || 0,
        count: parseInt(array.pop()!) || 0
      };
    }
  }

  /**
   * Build a query string URL from the specified entity model, viewed fields and query filter.
   * @param model Model type.
   * @param query Query filter.
   * @param fields Viewed fields.
   * @returns Returns the generated query string URL.
   */
  @Class.Public()
  public static toURL(model: Types.Model, query?: Types.Query, fields?: string[]): string {
    const queries = <(string | number)[]>[];
    if (fields && fields.length > 0) {
      queries.push(...this.packViewedFields(fields));
    }
    if (query) {
      if (query.pre) {
        queries.push(...this.packMatchRules(this.PreMatchPrefix, model, query.pre));
      }
      if (query.post) {
        queries.push(...this.packMatchRules(this.PostMatchPrefix, model, query.post));
      }
      if (query.sort) {
        queries.push(...this.packSort(model, query.sort));
      }
      if (query.limit) {
        queries.push(...this.packLimit(query.limit));
      }
    }
    return queries.length ? `${this.QueryPrefix}/${queries.join('/')}` : ``;
  }

  /**
   * Builds a query entity from the specified query URL.
   * @param model Model type.
   * @param url Query URL.
   * @returns Returns the generated query entity.
   * @throws Throws an error when there are unsupported data serialization in the specified URL.
   */
  @Class.Public()
  public static fromURL(model: Types.Model, url: string): Query {
    const path = Path.normalize(`./${url}`);
    const parts = path.split('/').reverse();
    const result = <Query>{ fields: [] };
    if (parts.pop() === this.QueryPrefix) {
      while (parts.length) {
        const prefix = parts[parts.length - 1];
        switch (prefix) {
          case this.PreMatchPrefix:
            result.pre = this.unpackMatchRules(this.PreMatchPrefix, model, parts);
            break;
          case this.PostMatchPrefix:
            result.post = this.unpackMatchRules(this.PostMatchPrefix, model, parts);
            break;
          case this.SortPrefix:
            result.sort = this.unpackSort(model, parts);
            break;
          case this.LimitPrefix:
            result.limit = this.unpackLimit(parts);
            break;
          case this.FieldsPrefix:
            result.fields = this.unpackViewedFields(parts);
            break;
          default:
            throw new Error(`Unsupported data serialization type.`);
        }
      }
    }
    return result;
  }
}
