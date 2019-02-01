/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import runJest from '../runJest';

describe('Fake promises', () => {
  it('should be possible to resolve with fake timers', () => {
    const result = runJest('fake-promises');
    expect(result.status).toBe(0);
  });
});
