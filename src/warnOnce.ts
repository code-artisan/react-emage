/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

const warnedKeys: { [key: string]: boolean } = {};

/**
 * A simple function that prints a warning message once per session.
 *
 * @param {string} key - The key used to ensure the message is printed once.
 *                       This should be unique to the callsite.
 * @param {string} message - The message to print
 */
export function warnOnce(key: string, message: string) {
  if (process.env.NODE_ENV !== 'production') {
    if (warnedKeys[key]) {
      return;
    }

    console.warn(message);

    warnedKeys[key] = true;
  }
}
