/*!
 * Copyright (C) 2018-2020 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Types from './types';

/**
 * Path route interface.
 */
export interface Route {
  /**
   * Entity model.
   */
  model: Types.Model;
  /**
   * Route path.
   */
  path?: string;
  /**
   * Query data.
   */
  query?: string;
  /**
   * Id value.
   */
  id?: string;
}
