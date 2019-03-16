/*
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Mapping from '@singleware/mapping';

import { Query } from './query';

/**
 * Route interface.
 */
export interface Route {
  /**
   * Entity model.
   */
  model: Mapping.Types.Model;
  /**
   * View name.
   */
  view?: string;
  /**
   * Query data.
   */
  query?: string | Query;
  /**
   * Id value.
   */
  id?: string;
}