/*
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Mapping from '@singleware/mapping';

/**
 * Path route interface.
 */
export interface Route {
  /**
   * Entity model.
   */
  model: Mapping.Types.Model;
  /**
   * Query data.
   */
  query?: string;
  /**
   * Id value.
   */
  id?: string;
}
