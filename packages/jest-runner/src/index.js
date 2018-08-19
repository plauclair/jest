/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig} from 'types/Config';
import type {Test, TestRunnerOptions, TestWatcher} from 'types/TestRunner';

import typeof {worker} from './test_worker';

import exit from 'exit';
import runTest from './run_test';
import throat from 'throat';
import Worker from 'jest-worker';
import Emittery from 'emittery/legacy';

const TEST_WORKER_PATH = require.resolve('./test_worker');

type WorkerInterface = Worker & {worker: worker};

class TestRunner {
  _globalConfig: GlobalConfig;
  eventEmitter: Emittery;

  constructor(globalConfig: GlobalConfig) {
    this._globalConfig = globalConfig;
    this.eventEmitter = new Emittery();
  }

  async runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    options: TestRunnerOptions,
  ): Promise<void> {
    return await (options.serial
      ? this._createInBandTestRun(tests, watcher)
      : this._createParallelTestRun(tests, watcher));
  }

  async _createInBandTestRun(tests: Array<Test>, watcher: TestWatcher) {
    process.env.JEST_WORKER_ID = '1';
    const mutex = throat(1);
    return tests.reduce(
      (promise, test) =>
        mutex(() =>
          promise
            .then(async () => {
              if (watcher.isInterrupted()) {
                throw new CancelRun();
              }

              await this.eventEmitter.emit('test-file-start', test);
              return runTest(
                test.path,
                this._globalConfig,
                test.context.config,
                test.context.resolver,
              );
            })
            .then(result =>
              this.eventEmitter.emit('test-file-success', test, result),
            )
            .catch(err =>
              this.eventEmitter.emit('test-file-failure', test, err),
            ),
        ),
      Promise.resolve(),
    );
  }

  async _createParallelTestRun(tests: Array<Test>, watcher: TestWatcher) {
    // $FlowFixMe: class object is augmented with worker when instantiating.
    const worker: WorkerInterface = new Worker(TEST_WORKER_PATH, {
      exposedMethods: ['worker'],
      forkOptions: {stdio: 'inherit'},
      maxRetries: 3,
      numWorkers: this._globalConfig.maxWorkers,
    });

    const mutex = throat(this._globalConfig.maxWorkers);

    // Send test suites to workers continuously instead of all at once to track
    // the start time of individual tests.
    const runTestInWorker = test =>
      mutex(async () => {
        if (watcher.isInterrupted()) {
          return Promise.reject();
        }

        await this.eventEmitter.emit('test-file-start', test);

        return worker.worker({
          config: test.context.config,
          globalConfig: this._globalConfig,
          path: test.path,
          serializableModuleMap: watcher.isWatchMode()
            ? test.context.moduleMap.toJSON()
            : null,
        });
      });

    const onError = async (err, test) => {
      await this.eventEmitter.emit('test-file-failure', test, err);
      if (err.type === 'ProcessTerminatedError') {
        console.error(
          'A worker process has quit unexpectedly! ' +
            'Most likely this is an initialization error.',
        );
        exit(1);
      }
    };

    const onInterrupt = new Promise((_, reject) => {
      watcher.on('change', state => {
        if (state.interrupted) {
          reject(new CancelRun());
        }
      });
    });

    const runAllTests = Promise.all(
      tests.map(test =>
        runTestInWorker(test)
          .then(result =>
            this.eventEmitter.emit('test-file-success', test, result),
          )
          .catch(error => onError(error, test)),
      ),
    );

    const cleanup = () => worker.end();
    return Promise.race([runAllTests, onInterrupt]).then(cleanup, cleanup);
  }
}

class CancelRun extends Error {
  constructor(message: ?string) {
    super(message);
    this.name = 'CancelRun';
  }
}

module.exports = TestRunner;
