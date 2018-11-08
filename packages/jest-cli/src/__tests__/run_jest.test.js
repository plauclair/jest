// Copyright (c) 2014-present, Facebook, Inc. All rights reserved.

import runJest from '../runJest';

jest.mock('jest-util');

describe('runJest', () => {
  test('when watch is set then print error and exit process', async () => {
    jest.spyOn(process, 'exit').mockImplementation(() => {});

    await runJest({
      changedFilesPromise: Promise.resolve({repos: {git: new Set()}}),
      contexts: [],
      globalConfig: {watch: true},
      onComplete: () => null,
      outputStream: {},
      startRun: {},
      testWatcher: {isInterrupted: () => true},
    });

    await new Promise(process.nextTick);

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
