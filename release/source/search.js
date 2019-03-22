"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Mapping = require("@singleware/mapping");
/**
 * Search helper class.
 */
let Search = class Search extends Class.Null {
    /**
     * Packs the specified view modes.
     * @param queries Query parameters list.
     * @param views View modes.
     */
    static packViews(queries, views) {
        const list = views.filter(view => view !== Mapping.Types.View.ALL);
        if (list.length > 0) {
            queries.push(`${this.ViewsPrefix}/${list.join(';')}`);
        }
    }
    /**
     * Unpacks the specified view modes string.
     * @param views View modes string.
     * @returns Returns the generated list of view modes.
     */
    static unpackViews(views) {
        return views.split(';');
    }
    /**
     * Packs the specified filters entity according to the given data model.
     * @param model Model type.
     * @param queries Query parameters list.
     * @param filter Filters entity.
     * @throws Throws an exception when the specified column does not exists in the provided data model.
     */
    static packFilters(model, queries, filter) {
        let parts = [];
        for (const name in filter) {
            const schema = Mapping.Schema.getRealColumn(model, name);
            const operation = filter[name];
            const expression = `${schema.name}:${operation.operator}`;
            switch (operation.operator) {
                case Mapping.Statements.Operator.REGEX:
                case Mapping.Statements.Operator.LESS:
                case Mapping.Statements.Operator.LESS_OR_EQUAL:
                case Mapping.Statements.Operator.EQUAL:
                case Mapping.Statements.Operator.NOT_EQUAL:
                case Mapping.Statements.Operator.GREATER_OR_EQUAL:
                case Mapping.Statements.Operator.GREATER:
                    parts.push(`${expression}:${encodeURIComponent(operation.value)}`);
                    break;
                case Mapping.Statements.Operator.BETWEEN:
                case Mapping.Statements.Operator.CONTAIN:
                case Mapping.Statements.Operator.NOT_CONTAIN:
                    parts.push(`${expression}:${[...operation.value].map(item => encodeURIComponent(item)).join('|')}`);
                    break;
            }
        }
        if (parts.length) {
            queries.push(`${this.FilterPrefix}/${parts.join(';')}`);
        }
    }
    /**
     * Unpacks the specified filters string according to the specified data model.
     * @param model Model type.
     * @param filter Filters string.
     * @returns Returns the generated filter object.
     * @throws Throws an exception when the specified column does not exists in the provided data model.
     */
    static unpackFilters(model, filter) {
        const newer = {};
        const fields = filter.split(';');
        for (const field of fields) {
            const [name, operator, value] = field.split(':', 3);
            const code = parseInt(operator);
            const schema = Mapping.Schema.getRealColumn(model, name);
            switch (code) {
                case Mapping.Statements.Operator.REGEX:
                case Mapping.Statements.Operator.LESS:
                case Mapping.Statements.Operator.LESS_OR_EQUAL:
                case Mapping.Statements.Operator.EQUAL:
                case Mapping.Statements.Operator.NOT_EQUAL:
                case Mapping.Statements.Operator.GREATER_OR_EQUAL:
                case Mapping.Statements.Operator.GREATER:
                    newer[schema.name] = { operator: code, value: decodeURIComponent(value) };
                    break;
                case Mapping.Statements.Operator.BETWEEN:
                case Mapping.Statements.Operator.CONTAIN:
                case Mapping.Statements.Operator.NOT_CONTAIN:
                    newer[schema.name] = { operator: code, value: value.split('|').map(value => decodeURIComponent(value)) };
                    break;
                default:
                    throw new Error(`Unsupported filter operator code "${code}"`);
            }
        }
        return newer;
    }
    /**
     * Packs the specified sort object according to the specified data model.
     * @param model Model type.
     * @param queries Query parameters list.
     * @param sort Sorting order.
     * @throws Throws an exception when the specified column does not exists in the provided data model.
     */
    static packSort(model, queries, sort) {
        let parts = [];
        for (const name in sort) {
            const schema = Mapping.Schema.getRealColumn(model, name);
            parts.push(`${schema.name}:${sort[name]}`);
        }
        if (parts.length) {
            queries.push(`${this.SortPrefix}/${parts.join(';')}`);
        }
    }
    /**
     * Unpacks the specified sort string according to the specified data model.
     * @param model Model type.
     * @param sort Sort string.
     * @returns Returns the generated sort object.
     * @throws Throws an exception when the specified column does not exists in the provided data model.
     */
    static unpackSort(model, sort) {
        const newer = {};
        const fields = sort.split(';');
        for (const field of fields) {
            const [name, order] = field.split(':', 2);
            const code = parseInt(order);
            const schema = Mapping.Schema.getRealColumn(model, name);
            switch (code) {
                case Mapping.Statements.Order.ASCENDING:
                case Mapping.Statements.Order.DESCENDING:
                    newer[schema.name] = code;
                    break;
                default:
                    throw new Error(`Unsupported sorting order code "${code}"`);
            }
        }
        return newer;
    }
    /**
     * Packs the specified limit object.
     * @param queries Query parameters list.
     * @param limit Limit object.
     */
    static packLimit(queries, limit) {
        queries.push(`${this.LimitPrefix}/${limit.start || 0};${limit.count || 0}`);
    }
    /**
     * Unpacks the specified limit string.
     * @param limit Limit string.
     * @returns Returns the generated limit object.
     */
    static unpackLimit(limit) {
        const [start, count] = limit.split(';', 2);
        return {
            start: parseInt(start),
            count: parseInt(count)
        };
    }
    /**
     * Build a query URL from the specified parameters.
     * @param model Model type.
     * @param views View modes.
     * @param filters Filter fields.
     * @param sort Sorting fields.
     * @param limit Result limits.
     * @returns Returns the generated URL path filter.
     * @throws Throws an error when there is a nonexistent column in the specified filter.
     */
    static toURL(model, views, filters, sort, limit) {
        const queries = [];
        if (views.length) {
            this.packViews(queries, views);
        }
        if (filters) {
            this.packFilters(model, queries, filters);
        }
        if (sort) {
            this.packSort(model, queries, sort);
        }
        if (limit) {
            this.packLimit(queries, limit);
        }
        return queries.length ? `${this.QueryPrefix}/${queries.join('/')}` : ``;
    }
    /**
     * Builds a query object from the specified query URL.
     * @param model Model type.
     * @param url Query URL.
     * @returns Returns the generated query object.
     * @throws Throws an error when there is a nonexistent column or unsupported data in the specified URL.
     */
    static fromURL(model, url) {
        const result = {
            views: [],
            filters: [],
            sort: void 0,
            limit: void 0
        };
        const parts = url.split('/').reverse();
        if (parts.pop() === this.QueryPrefix) {
            while (parts.length) {
                const data = parts.pop();
                switch (data) {
                    case this.ViewsPrefix:
                        result.views = this.unpackViews(parts.pop() || '');
                        break;
                    case this.FilterPrefix:
                        result.filters.push(this.unpackFilters(model, parts.pop() || ''));
                        break;
                    case this.SortPrefix:
                        result.sort = this.unpackSort(model, parts.pop() || '');
                        break;
                    case this.LimitPrefix:
                        result.limit = this.unpackLimit(parts.pop() || '');
                        break;
                    default:
                        throw new Error(`Unsupported serialized data type "${data}"`);
                }
            }
        }
        return result;
    }
};
/**
 * Magic query prefix.
 */
Search.QueryPrefix = 'query';
/**
 * Magic views prefix.
 */
Search.ViewsPrefix = 'v';
/**
 * Magic filter prefix.
 */
Search.FilterPrefix = 'f';
/**
 * Magic sort prefix.
 */
Search.SortPrefix = 's';
/**
 * Magic limit prefix.
 */
Search.LimitPrefix = 'l';
__decorate([
    Class.Private()
], Search, "QueryPrefix", void 0);
__decorate([
    Class.Private()
], Search, "ViewsPrefix", void 0);
__decorate([
    Class.Private()
], Search, "FilterPrefix", void 0);
__decorate([
    Class.Private()
], Search, "SortPrefix", void 0);
__decorate([
    Class.Private()
], Search, "LimitPrefix", void 0);
__decorate([
    Class.Private()
], Search, "packViews", null);
__decorate([
    Class.Private()
], Search, "unpackViews", null);
__decorate([
    Class.Private()
], Search, "packFilters", null);
__decorate([
    Class.Private()
], Search, "unpackFilters", null);
__decorate([
    Class.Private()
], Search, "packSort", null);
__decorate([
    Class.Private()
], Search, "unpackSort", null);
__decorate([
    Class.Private()
], Search, "packLimit", null);
__decorate([
    Class.Private()
], Search, "unpackLimit", null);
__decorate([
    Class.Public()
], Search, "toURL", null);
__decorate([
    Class.Public()
], Search, "fromURL", null);
Search = __decorate([
    Class.Describe()
], Search);
exports.Search = Search;
