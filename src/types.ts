/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type SourceObject = {
  /**
   * `body` is the HTTP body to send with the request. This must be a valid
   * UTF-8 string, and will be sent exactly as specified, with no
   * additional encoding (e.g. URL-escaping or base64) applied.
   */
  body?: string,
  /**
   * `cache` determines how the requests handles potentially cached
   * responses.
   *
   * - `default`: Use the native platforms default strategy. `useProtocolCachePolicy` on iOS.
   *
   * - `reload`: The data for the URL will be loaded from the originating source.
   * No existing cache data should be used to satisfy a URL load request.
   *
   * - `force-cache`: The existing cached data will be used to satisfy the request,
   * regardless of its age or expiration date. If there is no existing data in the cache
   * corresponding the request, the data is loaded from the originating source.
   *
   * - `only-if-cached`: The existing cache data will be used to satisfy a request, regardless of
   * its age or expiration date. If there is no existing data in the cache corresponding
   * to a URL load request, no attempt is made to load the data from the originating source,
   * and the load is considered to have failed.
   *
   * @platform ios
   */
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached',
  /**
   * `headers` is an object representing the HTTP headers to send along with the
   * request for a remote image.
   */
  headers?: { [key: string]: string },
  /**
   * `method` is the HTTP Method to use. Defaults to GET if not specified.
   */
  method?: string,
  /**
   * `scale` is used to indicate the scale factor of the image. Defaults to 1.0 if
   * unspecified, meaning that one image pixel equates to one display point / DIP.
   */
  scale?: number,
  /**
   * `uri` is a string representing the resource identifier for the image, which
   * could be an http address, a local file path, or the name of a static image
   * resource (which should be wrapped in the `require('./path/to/image.png')`
   * function).
   */
  uri: string,
  /**
   * `width` and `height` can be specified if known at build time, in which case
   * these will be used to set the default `<Image/>` component dimensions.
   */
  height?: number,
  width?: number
};

export type ResizeMode =
  | 'center'
  | 'contain'
  | 'cover'
  | 'none'
  | 'repeat'
  | 'stretch';

export type Source = number | string | SourceObject | Array<SourceObject>;

export type ImageStyle = {
  // @deprecated
  resizeMode?: ResizeMode,
  tintColor?: null | string
};

export type ImageProps = {
  blurRadius?: number,
  defaultSource?: Source,
  draggable?: boolean,
  onError?: (e: any) => void,
  onLayout?: (e: any) => void,
  onLoad?: (e: any) => void,
  onLoadEnd?: (e: any) => void,
  onLoadStart?: () => void,
  onProgress?: (e: any) => void,
  resizeMode?: ResizeMode,
  source?: Source,
  style?: React.CSSProperties,
  tintColor?: null | string
};

export type LayoutValue = {
  x: number,
  y: number,
  width: number,
  height: number
};

export type LayoutEvent = {
  nativeEvent: {
    layout: LayoutValue,
    target: any
  },
  timeStamp: number
};