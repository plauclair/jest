/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  AggregatedResult,
  SnapshotSummary as SnapshotSummaryType,
} from 'types/TestResult';
import type {GlobalConfig} from 'types/Config';
import type {Context} from 'types/Context';
import type {ReporterOnStartOptions} from 'types/Reporters';

import chalk from 'chalk';
import React from 'react';
import {Box, Color, Text, render} from 'ink';
import BaseReporter from './base_reporter';
import {Summary} from './utils';
import getResultHeader from './get_result_header';
import SummaryComp from './get_snapshot_summary';
import testPathPatternToRegExp from '../testPathPatternToRegexp';

const TEST_SUMMARY_THRESHOLD = 20;

const NPM_EVENTS = new Set([
  'prepublish',
  'publish',
  'postpublish',
  'preinstall',
  'install',
  'postinstall',
  'preuninstall',
  'uninstall',
  'postuninstall',
  'preversion',
  'version',
  'postversion',
  'pretest',
  'test',
  'posttest',
  'prestop',
  'stop',
  'poststop',
  'prestart',
  'start',
  'poststart',
  'prerestart',
  'restart',
  'postrestart',
]);

const SnapshotHeader = ({
  aggregatedResults,
  globalConfig,
  paddingSummary,
}: {
  aggregatedResults: AggregatedResult,
  globalConfig: GlobalConfig,
  paddingSummary: boolean,
}) => {
  // executed, re-print the failing results at the end of execution output.
  const failedTests = aggregatedResults.numFailedTests;
  const runtimeErrors = aggregatedResults.numRuntimeErrorTestSuites;
  if (
    failedTests + runtimeErrors <= 0 ||
    aggregatedResults.numTotalTestSuites <= TEST_SUMMARY_THRESHOLD
  ) {
    return null;
  }
  return (
    <Box paddingTop={paddingSummary ? 1 : 0} paddingBottom={1}>
      <Text bold>Summary of all failing tests</Text>
      {aggregatedResults.testResults
        .filter(({failureMessage}) => failureMessage)
        .map(testResult => {
          const {failureMessage} = testResult;
          return (
            <Box flexDirection="column">
              <Box>{getResultHeader(testResult, globalConfig)}</Box>
              <Box paddingY={1}>{failureMessage}</Box>
            </Box>
          );
        })}
    </Box>
  );
};

const SnapshotSummary = ({
  globalConfig,
  snapshots,
}: {
  globalConfig: GlobalConfig,
  snapshots: SnapshotSummaryType,
}) => {
  if (
    !(
      snapshots.added ||
      snapshots.filesRemoved ||
      snapshots.unchecked ||
      snapshots.unmatched ||
      snapshots.updated
    )
  ) {
    return null;
  }

  let updateCommand;
  const event = process.env.npm_lifecycle_event;
  const prefix = NPM_EVENTS.has(event) ? '' : 'run ';
  const isYarn =
    typeof process.env.npm_config_user_agent === 'string' &&
    process.env.npm_config_user_agent.match('yarn') !== null;
  const client = isYarn ? 'yarn' : 'npm';
  const scriptUsesJest =
    typeof process.env.npm_lifecycle_script === 'string' &&
    process.env.npm_lifecycle_script.indexOf('jest') !== -1;

  if (globalConfig.watch || globalConfig.watchAll) {
    updateCommand = 'press `u`';
  } else if (event && scriptUsesJest) {
    updateCommand = `run \`${client +
      ' ' +
      prefix +
      event +
      (isYarn ? '' : ' --')} -u\``;
  } else {
    updateCommand = 're-run jest with `-u`';
  }

  return (
    <Box paddingBottom={1}>
      <SummaryComp
        globalConfig={globalConfig}
        snapshots={snapshots}
        updateCommand={updateCommand}
      />
    </Box>
  );
};

export default class SummaryReporter extends BaseReporter {
  _estimatedTime: number;
  _globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    super();
    this._globalConfig = globalConfig;
    this._estimatedTime = 0;
  }

  onRunStart(
    aggregatedResults: AggregatedResult,
    options: ReporterOnStartOptions,
  ) {
    super.onRunStart(aggregatedResults, options);
    this._estimatedTime = options.estimatedTime;
  }

  onRunComplete(contexts: Set<Context>, aggregatedResults: AggregatedResult) {
    const {numTotalTestSuites, testResults, wasInterrupted} = aggregatedResults;
    if (numTotalTestSuites) {
      const lastResult = testResults[testResults.length - 1];
      // Print a newline if the last test did not fail to line up newlines
      // similar to when an error would have been thrown in the test.
      const padSummary =
        !this._globalConfig.verbose &&
        lastResult &&
        !lastResult.numFailingTests &&
        !lastResult.testExecError;

      const unmount = render(
        <Box flexDirection="column">
          <SnapshotHeader
            globalConfig={this._globalConfig}
            aggregatedResults={aggregatedResults}
            paddingSummary={padSummary}
          />
          <SnapshotSummary
            snapshots={aggregatedResults.snapshot}
            globalConfig={this._globalConfig}
          />
          {numTotalTestSuites > 0 && (
            <Box flexDirection="column">
              <Summary
                aggregatedResults={aggregatedResults}
                options={{estimatedTime: this._estimatedTime}}
              />
              {!this._globalConfig.silent && (
                <Box paddingTop={1}>
                  {wasInterrupted ? (
                    <Color bold red>
                      Test run was interrupted.
                    </Color>
                  ) : (
                    <Box>
                      {this._getTestSummary(contexts, this._globalConfig)}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>,
      );

      unmount();
    }
  }

  _getTestSummary(contexts: Set<Context>, globalConfig: GlobalConfig) {
    let testInfo = '';

    if (globalConfig.runTestsByPath) {
      testInfo = <Color dim> within paths</Color>;
    } else if (globalConfig.onlyChanged) {
      testInfo = <Color dim> related to changed files</Color>;
    } else if (globalConfig.testPathPattern) {
      const prefix = globalConfig.findRelatedTests
        ? ' related to files matching '
        : ' matching ';
      testInfo = (
        <Box>
          <Color dim>{prefix}</Color>
          {testPathPatternToRegExp(globalConfig.testPathPattern).toString()}
        </Box>
      );
    }

    let nameInfo = '';

    if (globalConfig.runTestsByPath) {
      nameInfo = ' ' + globalConfig.nonFlagArgs.map(p => `"${p}"`).join(', ');
    } else if (globalConfig.testNamePattern) {
      nameInfo = (
        <Box>
          <Color dim> with tests matching </Color>"
          {globalConfig.testNamePattern}"
        </Box>
      );
    }

    const contextInfo =
      contexts.size > 1 ? (
        <Box>
          <Color dim> in </Color>
          {contexts.size}
          <Color dim> projects</Color>
        </Box>
      ) : (
        ''
      );

    return (
      <Box>
        <Color dim>Ran all test suites</Color>
        {testInfo}
        {nameInfo}
        {contextInfo}
        <Color dim>.</Color>
      </Box>
    );
  }
}
