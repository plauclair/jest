/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Path, ProjectConfig, GlobalConfig} from 'types/Config';
import type {AggregatedResult} from 'types/TestResult';

import path from 'path';
import chalk from 'chalk';
import slash from 'slash';
import React, {PureComponent, Fragment} from 'react';
import {Box, Color, Text} from 'ink';

type SummaryOptions = {|
  estimatedTime?: number,
  roundTime?: boolean,
  width?: number,
|};

const PROGRESS_BAR_WIDTH = 40;

export const printDisplayName = (config: ProjectConfig) => {
  const {displayName} = config;

  if (displayName) {
    return chalk.supportsColor
      ? chalk.reset.inverse.white(` ${displayName} `)
      : displayName;
  }

  return '';
};

export const FormattedPath = ({
  pad,
  config,
  testPath,
  columns,
}: {
  pad: number,
  config: ProjectConfig | GlobalConfig,
  testPath: Path,
  columns: number,
}) => {
  const maxLength = columns - pad;
  const relative = relativePath(config, testPath);
  const {basename} = relative;
  let {dirname} = relative;
  dirname = slash(dirname);

  // length is ok
  if ((dirname + '/' + basename).length <= maxLength) {
    return (
      <Fragment>
        <Color dim>{dirname}/</Color>
        <Color bold>{basename}</Color>
      </Fragment>
    );
  }

  // we can fit trimmed dirname and full basename
  const basenameLength = basename.length;
  if (basenameLength + 4 < maxLength) {
    const dirnameLength = maxLength - 4 - basenameLength;
    dirname =
      '…' + dirname.slice(dirname.length - dirnameLength, dirname.length);
    return (
      <Fragment>
        <Color dim>{dirname}/</Color>
        <Color bold>{basename}</Color>
      </Fragment>
    );
  }

  if (basenameLength + 4 === maxLength) {
    return (
      <Fragment>
        <Color dim>…/</Color>
        <Color bold>{basename}</Color>
      </Fragment>
    );
  }

  // can't fit dirname, but can fit trimmed basename
  return (
    <Color bold>
      …{basename.slice(basename.length - maxLength - 4, basename.length)}
    </Color>
  );
};

export const formatTestPath = (
  config: GlobalConfig | ProjectConfig,
  testPath: Path,
) => {
  const {dirname, basename} = relativePath(config, testPath);
  return slash(chalk.dim(dirname + path.sep) + chalk.bold(basename));
};

export const relativePath = (
  config: GlobalConfig | ProjectConfig,
  testPath: Path,
) => {
  // this function can be called with ProjectConfigs or GlobalConfigs. GlobalConfigs
  // do not have config.cwd, only config.rootDir. Try using config.cwd, fallback
  // to config.rootDir. (Also, some unit just use config.rootDir, which is ok)
  testPath = path.relative(config.cwd || config.rootDir, testPath);
  const dirname = path.dirname(testPath);
  const basename = path.basename(testPath);
  return {basename, dirname};
};

export const pluralize = (word: string, count: number) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

type SummaryProps = {
  aggregatedResults: AggregatedResult,
  options?: SummaryOptions,
};

export class Summary extends PureComponent<SummaryProps, {runTime: number}> {
  interval: IntervalID;
  constructor(props: SummaryProps) {
    super(props);

    this.state = {runTime: this.getRuntime(props)};
  }

  getRuntime(props: SummaryProps) {
    const {aggregatedResults, options} = props;

    let runTime = (Date.now() - aggregatedResults.startTime) / 1000;

    if (options && options.roundTime) {
      runTime = Math.floor(runTime);
    }

    return runTime;
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      const runTime = this.getRuntime(this.props);

      this.setState({runTime});
      // $FlowFixMe: `unref` exists in Node
    }, 1000).unref();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const {aggregatedResults, options} = this.props;
    const {runTime} = this.state;

    const estimatedTime = (options && options.estimatedTime) || 0;
    const snapshotResults = aggregatedResults.snapshot;
    const snapshotsAdded = snapshotResults.added;
    const snapshotsFailed = snapshotResults.unmatched;
    const snapshotsOutdated = snapshotResults.unchecked;
    const snapshotsFilesRemoved = snapshotResults.filesRemoved;
    const snapshotsDidUpdate = snapshotResults.didUpdate;
    const snapshotsPassed = snapshotResults.matched;
    const snapshotsTotal = snapshotResults.total;
    const snapshotsUpdated = snapshotResults.updated;
    const suitesFailed = aggregatedResults.numFailedTestSuites;
    const suitesPassed = aggregatedResults.numPassedTestSuites;
    const suitesPending = aggregatedResults.numPendingTestSuites;
    const suitesRun = suitesFailed + suitesPassed;
    const suitesTotal = aggregatedResults.numTotalTestSuites;
    const testsFailed = aggregatedResults.numFailedTests;
    const testsPassed = aggregatedResults.numPassedTests;
    const testsPending = aggregatedResults.numPendingTests;
    const testsTodo = aggregatedResults.numTodoTests;
    const testsTotal = aggregatedResults.numTotalTests;
    const width = (options && options.width) || 0;

    return (
      <Box flexDirection="column">
        <Box>
          <Box width={13}>
            <Text bold>Test Suites:</Text>
          </Box>
          {suitesFailed > 0 && (
            <Fragment>
              <Color bold red>
                {suitesFailed} failed
              </Color>
              ,{' '}
            </Fragment>
          )}
          {suitesPending > 0 && (
            <Fragment>
              <Color bold yellow>
                {suitesPending} skipped
              </Color>
              ,{' '}
            </Fragment>
          )}
          {suitesPassed > 0 && (
            <Fragment>
              <Color bold green>
                {suitesPassed} passed
              </Color>
              ,{' '}
            </Fragment>
          )}
          {suitesRun !== suitesTotal && suitesRun + ' of '}
          {suitesTotal} total
        </Box>
        <Box>
          <Box width={13}>
            <Text bold>Tests:</Text>
          </Box>
          {testsFailed > 0 && (
            <Fragment>
              <Color bold red>
                {testsFailed} failed
              </Color>
              ,{' '}
            </Fragment>
          )}
          {testsPending > 0 && (
            <Fragment>
              <Color bold yellow>
                {testsPending} skipped
              </Color>
              ,{' '}
            </Fragment>
          )}
          {testsTodo > 0 && (
            <Fragment>
              <Color bold magenta>
                {testsTodo} todo
              </Color>
              ,{' '}
            </Fragment>
          )}
          {testsPassed > 0 && (
            <Fragment>
              <Color bold green>
                {testsPassed} passed
              </Color>
              ,{' '}
            </Fragment>
          )}
          {testsTotal} total
        </Box>
        <Box>
          <Box width={13}>
            <Text bold>Snapshots:</Text>
          </Box>
          {snapshotsFailed > 0 && (
            <Fragment>
              <Color bold red>
                {snapshotsFailed} failed
              </Color>
              ,{' '}
            </Fragment>
          )}
          {snapshotsOutdated > 0 &&
            !snapshotsDidUpdate && (
              <Fragment>
                <Color bold yellow>
                  {snapshotsOutdated} obsolete
                </Color>
                ,{' '}
              </Fragment>
            )}
          {snapshotsOutdated > 0 &&
            snapshotsDidUpdate && (
              <Fragment>
                <Color bold green>
                  {snapshotsOutdated} removed
                </Color>
                ,{' '}
              </Fragment>
            )}
          {snapshotsFilesRemoved > 0 &&
            !snapshotsDidUpdate && (
              <Fragment>
                <Color bold yellow>
                  {pluralize('file', snapshotsFilesRemoved)} obsolete
                </Color>
                ,{' '}
              </Fragment>
            )}
          {snapshotsFilesRemoved > 0 &&
            snapshotsDidUpdate && (
              <Fragment>
                <Color bold green>
                  {pluralize('file', snapshotsFilesRemoved)} removed
                </Color>
                ,{' '}
              </Fragment>
            )}
          {snapshotsUpdated > 0 && (
            <Fragment>
              <Color bold green>
                {snapshotsUpdated} updated
              </Color>
              ,{' '}
            </Fragment>
          )}
          {snapshotsAdded > 0 && (
            <Fragment>
              <Color bold green>
                {snapshotsAdded} written
              </Color>
              ,{' '}
            </Fragment>
          )}
          {snapshotsPassed > 0 && (
            <Fragment>
              <Color bold green>
                {snapshotsPassed} passed
              </Color>
              ,{' '}
            </Fragment>
          )}
          {snapshotsTotal} total
        </Box>
        <Time runTime={runTime} estimatedTime={estimatedTime} width={width} />
      </Box>
    );
  }
}

const Time = ({runTime, estimatedTime, width}) => {
  // If we are more than one second over the estimated time, highlight it.
  const renderedTime =
    estimatedTime && runTime >= estimatedTime + 1 ? (
      <Color bold yellow>
        {runTime}s
      </Color>
    ) : (
      <Text>{runTime}s</Text>
    );

  let progressBar;

  // Only show a progress bar if the test run is actually going to take
  // some time.
  if (estimatedTime > 2 && runTime < estimatedTime && width) {
    const availableWidth = Math.min(PROGRESS_BAR_WIDTH, width);
    const length = Math.min(
      Math.floor((runTime / estimatedTime) * availableWidth),
      availableWidth,
    );
    if (availableWidth >= 2) {
      progressBar = (
        <Box>
          <Color green>{'█'.repeat(length)}</Color>
          <Color white>{'█'.repeat(availableWidth - length)}</Color>
        </Box>
      );
    }
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Box width={13}>
          <Text bold>Time:</Text>
        </Box>
        {renderedTime}
        {runTime < estimatedTime && (
          <Fragment>, estimated {estimatedTime}s</Fragment>
        )}
      </Box>
      {progressBar}
    </Box>
  );
};

// word-wrap a string that contains ANSI escape sequences.
// ANSI escape sequences do not add to the string length.
export const wrapAnsiString = (string: string, terminalWidth: number) => {
  if (terminalWidth === 0) {
    // if the terminal width is zero, don't bother word-wrapping
    return string;
  }

  const ANSI_REGEXP = /[\u001b\u009b]\[\d{1,2}m/g;
  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = ANSI_REGEXP.exec(string))) {
    const ansi = match[0];
    const index = match['index'];
    if (index != lastIndex) {
      tokens.push(['string', string.slice(lastIndex, index)]);
    }
    tokens.push(['ansi', ansi]);
    lastIndex = index + ansi.length;
  }

  if (lastIndex != string.length - 1) {
    tokens.push(['string', string.slice(lastIndex, string.length)]);
  }

  let lastLineLength = 0;

  return tokens
    .reduce(
      (lines, [kind, token]) => {
        if (kind === 'string') {
          if (lastLineLength + token.length > terminalWidth) {
            while (token.length) {
              const chunk = token.slice(0, terminalWidth - lastLineLength);
              const remaining = token.slice(
                terminalWidth - lastLineLength,
                token.length,
              );
              lines[lines.length - 1] += chunk;
              lastLineLength += chunk.length;
              token = remaining;
              if (token.length) {
                lines.push('');
                lastLineLength = 0;
              }
            }
          } else {
            lines[lines.length - 1] += token;
            lastLineLength += token.length;
          }
        } else {
          lines[lines.length - 1] += token;
        }

        return lines;
      },
      [''],
    )
    .join('\n');
};
