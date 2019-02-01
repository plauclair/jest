/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

describe('Lolex as implementation fo fake timers', () => {
  it('should be possible to use Lolex from config', () => {
    const result = runJest('lolex/from-config');
    expect(result.status).toBe(0);
  });

  it('should be possible to use Lolex from jest-object', () => {
    const result = runJest('lolex/from-jest-object');
    expect(result.status).toBe(0);
  });
});
