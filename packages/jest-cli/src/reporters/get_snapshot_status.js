/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {TestResult} from 'types/TestResult';

import React, {Fragment} from 'react';
import {Box, Color} from 'ink';

const {pluralize} = require('./utils');

const Arrow = () => ' \u203A ';
const Dot = () => ' \u2022 ';

const FailColor = ({children}) => (
  <Color bold red>
    {children}
  </Color>
);
const SnapshotAdded = ({children}) => (
  <Color bold green>
    {children}
  </Color>
);
const SnapshotUpdated = ({children}) => (
  <Color bold green>
    {children}
  </Color>
);
const SnapshotOutdated = ({children}) => (
  <Color bold yellow>
    {children}
  </Color>
);

const SnapshotStatus = ({
  snapshot,
  afterUpdate,
}: {
  snapshot: $PropertyType<TestResult, 'snapshot'>,
  afterUpdate: boolean,
}) => {
  return (
    <Fragment>
      {snapshot.added > 0 && (
        <SnapshotAdded>
          <Arrow /> {pluralize('snapshot', snapshot.added)} written.
        </SnapshotAdded>
      )}
      {snapshot.updated > 0 && (
        <SnapshotUpdated>
          <Arrow /> {pluralize('snapshot', snapshot.updated)} updated.
        </SnapshotUpdated>
      )}
      {snapshot.unmatched > 0 && (
        <FailColor>
          <Arrow /> {pluralize('snapshot', snapshot.unmatched)} failed.
        </FailColor>
      )}
      {snapshot.unchecked > 0 ? (
        afterUpdate ? (
          <SnapshotUpdated>
            <Arrow /> {pluralize('snapshot', snapshot.unchecked)} removed.
          </SnapshotUpdated>
        ) : (
          <SnapshotOutdated>
            <Arrow /> {pluralize('snapshot', snapshot.unchecked)} obsolete.
          </SnapshotOutdated>
        )
      ) : null}
      {snapshot.unchecked > 0 &&
        snapshot.uncheckedKeys.map(key => (
          <Box key={key}>
            &nbsp;&nbsp;
            <Dot />
            {key}
          </Box>
        ))}
      {snapshot.fileDeleted && (
        <SnapshotUpdated>
          <Arrow /> snapshot file removed.
        </SnapshotUpdated>
      )}
    </Fragment>
  );
};

export default SnapshotStatus;
