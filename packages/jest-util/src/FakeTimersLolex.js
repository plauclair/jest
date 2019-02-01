/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ProjectConfig} from 'types/Config';
import type {Global} from 'types/Global';
import type {lolex, Clock} from 'lolex';

import {withGlobal as lolexWithGlobal} from 'lolex';
import {formatStackTrace} from 'jest-message-util';

export default class FakeTimers {
  _clock: Clock;
  _config: ProjectConfig;
  _fakingTime: boolean;
  _global: Global;
  _lolex: lolex;
  _maxLoops: number;

  constructor({
    global,
    config,
    maxLoops,
  }: {
    global: Global,
    config: ProjectConfig,
    maxLoops?: number,
  }) {
    this._global = global;
    this._config = config;
    this._maxLoops = maxLoops || 100000;

    this._fakingTime = false;
    this._lolex = lolexWithGlobal(global);
  }

  clearAllTimers() {
    if (this._fakingTime) {
      this._clock.reset();
    }
  }

  dispose() {
    this.useRealTimers();
  }

  runAllTimers() {
    if (this._checkFakeTimers()) {
      this._clock.runAll();
    }
  }

  runOnlyPendingTimers() {
    if (this._checkFakeTimers()) {
      this._clock.runToLast();
    }
  }

  advanceTimersByTime(msToRun: number) {
    if (this._checkFakeTimers()) {
      this._clock.tick(msToRun);
    }
  }

  runAllTicks() {
    if (this._checkFakeTimers()) {
      this._clock.runMicrotasks();
    }
  }

  useRealTimers() {
    if (this._fakingTime) {
      this._clock.uninstall();
      this._fakingTime = false;
    }
  }

  useFakeTimers() {
    const toFake = Object.keys(this._lolex.timers);

    if (!this._fakingTime) {
      this._clock = this._lolex.install({
        loopLimit: this._maxLoops,
        now: Date.now(),
        target: this._global,
        toFake,
      });

      this._fakingTime = true;
    }
  }

  reset() {
    if (this._checkFakeTimers()) {
      const {now} = this._clock;
      this._clock.reset();
      this._clock.setSystemTime(now);
    }
  }

  setSystemTime(now?: number) {
    if (this._checkFakeTimers()) {
      this._clock.setSystemTime(now);
    }
  }

  getRealSystemTime() {
    return Date.now();
  }

  getTimerCount() {
    if (this._checkFakeTimers()) {
      return this._clock.countTimers();
    }

    return 0;
  }

  _checkFakeTimers() {
    if (!this._fakingTime) {
      this._global.console.warn(
        'A function to advance timers was called but the timers API is not ' +
          'mocked with fake timers. Call `jest.useFakeTimers()` in this test or ' +
          'enable fake timers globally by setting `"timers": "fake"` in the ' +
          'configuration file\nStack Trace:\n' +
          formatStackTrace(new Error().stack, this._config, {
            noStackTrace: false,
          }),
      );
    }

    return this._fakingTime;
  }
}
