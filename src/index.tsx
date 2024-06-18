import type { ImageProps, Source } from './types';

import * as React from 'react';
import { getAssetByID } from './AssetRegistry';
import ImageLoader from './ImageLoader';
import { warnOnce } from './warnOnce';

export type { ImageProps };

const ERRORED = 'ERRORED';
const LOADED = 'LOADED';
const LOADING = 'LOADING';
const IDLE = 'IDLE';

const styles = {
  root: {
    position: 'relative' as const,
    flexBasis: 'auto',
    overflow: 'hidden',
    zIndex: 0
  },
  inline: {
    display: 'inline-flex'
  },
  undo: {
    // These styles are converted to CSS filters applied to the
    // element displaying the background image.
    blurRadius: null,
    shadowColor: null,
    shadowOpacity: null,
    shadowOffset: null,
    shadowRadius: null,
    tintColor: null,
    // These styles are not supported
    overlayColor: null,
    resizeMode: null
  },
  image: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    height: '100%',
    width: '100%',
    zIndex: -1
  },
  accessibilityImage$raw: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    opacity: 0,
    width: '100%',
    zIndex: -1
  }
};

const resizeModeStyles = {
  center: {
    backgroundSize: 'auto'
  },
  contain: {
    backgroundSize: 'contain'
  },
  cover: {
    backgroundSize: 'cover'
  },
  none: {
    backgroundPosition: '0',
    backgroundSize: 'auto'
  },
  repeat: {
    backgroundPosition: '0',
    backgroundRepeat: 'repeat',
    backgroundSize: 'auto'
  },
  stretch: {
    backgroundSize: '100% 100%'
  }
};

let _filterId = 0;
const svgDataUriPattern = /^(data:image\/svg\+xml;utf8,)(.*)/;

function createTintColorSVG(tintColor: string, id: number) {
  return tintColor && id !== null ? (
    <svg
      style={{
        position: 'absolute',
        height: 0,
        visibility: 'hidden',
        width: 0
      }}
    >
      <defs>
        <filter id={`tint-${id}`} suppressHydrationWarning={true}>
          <feFlood floodColor={`${tintColor}`} key={tintColor} />
          <feComposite in2="SourceAlpha" operator="atop" />
        </filter>
      </defs>
    </svg>
  ) : null;
}

function extractNonStandardStyleProps(
  style?: any,
  blurRadius?: number,
  filterId?: number | string | null,
  tintColorProp?: string | null
) {
  const flatStyle = style || {};
  const { filter, resizeMode, tintColor } = flatStyle;

  if (flatStyle.resizeMode) {
    warnOnce(
      'Image.style.resizeMode',
      'Image: style.resizeMode is deprecated. Please use d.'
    );
  }

  if (flatStyle.tintColor) {
    warnOnce(
      'Image.style.tintColor',
      'Image: style.tintColor is deprecated. Please use props.tintColor.'
    );
  }

  // Add CSS filters
  // React Native exposes these features as props and proprietary styles
  const filters = [];

  if (filter) {
    filters.push(filter);
  }

  if (blurRadius) {
    filters.push(`blur(${blurRadius}px)`);
  }

  if ((tintColorProp || tintColor) && filterId !== null) {
    filters.push(`url(#tint-${filterId})`);
  }

  return [resizeMode, filters.length > 0 ? filters.join(' ') : null, tintColor];
}

function resolveAssetDimensions(source?: Source) {
  if (typeof source === 'number') {
    const { height, width } = getAssetByID(source);
    return { height, width };
  }

  if (source !== null && !Array.isArray(source) && typeof source === 'object') {
    const { height, width } = source;
    return { height, width };
  }
}

function resolveAssetUri(source?: Source) {
  let uri = null;

  if (typeof source === 'string') {
    uri = source;
  } else if (typeof source === 'number') {
    // get the URI from the packager
    const asset = getAssetByID(source);
    if (asset === null) {
      throw new Error(
        `Image: asset with ID "${source}" could not be found. Please check the image source or packager.`
      );
    }

    let [scale] = asset.scales;
    if (asset.scales.length > 1) {
      const preferredScale = window.devicePixelRatio || 1;
      // Get the scale which is closest to the preferred scale
      scale = asset.scales.reduce((prev, curr) => Math.abs(curr - preferredScale) < Math.abs(prev - preferredScale) ? curr : prev);
    }

    const scaleSuffix = scale !== 1 ? `@${scale}x` : '';

    uri = asset ? `${asset.httpServerLocation}/${asset.name}${scaleSuffix}.${asset.type}` : '';
  } else if (Array.isArray(source)) {
    uri = source[0].uri;
  } else if (source) {
    uri = source.uri;
  }

  if (uri) {
    const match = uri.match(svgDataUriPattern);
    // inline SVG markup may contain characters (e.g., #, ") that need to be escaped
    if (match) {
      const [, prefix, svg] = match;
      const encodedSvg = encodeURIComponent(svg);
      return `${prefix}${encodedSvg}`;
    }
  }

  return uri;
}

const Image = React.forwardRef((props: React.PropsWithChildren<ImageProps>, ref) => {
  const {
    defaultSource,
    draggable,
    blurRadius,
    onError,
    onLayout,
    onLoad,
    onLoadEnd,
    onLoadStart,
    source,
    style,
    tintColor: propTintColor,
    resizeMode: propResizeMode,
    ...rest
  } = props;

  const [state, updateState] = React.useState(() => {
    const uri = resolveAssetUri(source);
    if (uri !== null) {
      const isLoaded = ImageLoader.has(uri);
      if (isLoaded) {
        return LOADED;
      }
    }
    return IDLE;
  });

  const [layout, updateLayout] = React.useState({ height: 0, width: 0 });
  const hiddenImageRef = React.useRef(null);
  const filterRef = React.useRef(_filterId++);
  const requestRef = React.useRef<number | null>(null);
  const shouldDisplaySource = state === LOADED || (state === LOADING && defaultSource === null);

  const [_resizeMode, filter, _tintColor] = extractNonStandardStyleProps(
    style,
    blurRadius,
    filterRef.current,
    propTintColor
  );
  const viewRef = React.useRef<HTMLDivElement | null>(null);

  const resizeMode = propResizeMode || _resizeMode || 'cover';
  const tintColor = propTintColor || _tintColor;
  const selectedSource = shouldDisplaySource ? source : defaultSource;
  const displayImageUri = resolveAssetUri(selectedSource);
  const imageSizeStyle = resolveAssetDimensions(selectedSource);
  const backgroundImage = displayImageUri ? `url("${displayImageUri}")` : undefined;

  function getBackgroundSize() {
    if (
      hiddenImageRef.current !== null &&
      (resizeMode === 'center' || resizeMode === 'repeat')
    ) {
      const { naturalHeight, naturalWidth } = hiddenImageRef.current;
      const { height, width } = layout;
      if (naturalHeight && naturalWidth && height && width) {
        const scaleFactor = Math.min(
          1,
          width / naturalWidth,
          height / naturalHeight
        );
        const x = Math.ceil(scaleFactor * naturalWidth);
        const y = Math.ceil(scaleFactor * naturalHeight);
        return `${x}px ${y}px`;
      }
    }
  }

  const backgroundSize = getBackgroundSize();

  // Accessibility image allows users to trigger the browser's image context menu
  const hiddenImage = displayImageUri ? React.createElement('img', {
    alt: '',
    style: styles.accessibilityImage$raw,
    draggable: draggable || false,
    ref: hiddenImageRef,
    src: displayImageUri
  }) : null;

  React.useEffect(() => {
    if (viewRef.current) {
      const clientRect = viewRef.current.getBoundingClientRect();

      if (resizeMode === 'center' || resizeMode === 'repeat' || onLayout) {
        onLayout?.(clientRect);
        updateLayout({ width: clientRect?.width, height: clientRect?.height });
      }
    }
  }, [onLayout, resizeMode]);

  // Image loading
  const uri = resolveAssetUri(source);
  React.useEffect(() => {
    function abortPendingRequest() {
      if (requestRef.current !== null) {
        ImageLoader.abort(requestRef.current);
        requestRef.current = null;
      }
    }

    abortPendingRequest();

    if (uri !== null) {
      updateState(LOADING);

      onLoadStart?.();

      requestRef.current = ImageLoader.load(
        uri,
        function load(e) {
          updateState(LOADED);
          if (onLoad) {
            onLoad(e);
          }

          onLoadEnd?.(e);
        },
        function error(e) {
          updateState(ERRORED);

          onError?.({
            nativeEvent: {
              error: `Failed to load resource ${uri} (404)`
            }
          });

          onLoadEnd?.(e);
        }
      );
    }

    return abortPendingRequest;
  }, [uri, requestRef, updateState, onError, onLoad, onLoadEnd, onLoadStart]);

  React.useImperativeHandle(ref, () => viewRef);

  return (
    <div
      {...rest}
      ref={viewRef}
      style={{
        ...styles.root,
        ...imageSizeStyle,
        ...(style || {}),
        ...styles.undo
      }}
    >
      <div
        style={{
          ...styles.image,
          ...resizeModeStyles[resizeMode as keyof typeof resizeModeStyles],
          backgroundImage,
          filter,
          ...(backgroundSize ? { backgroundSize } : {}),
        }}
        suppressHydrationWarning={true}
      />
      {hiddenImage}
      {createTintColorSVG(tintColor, filterRef.current)}
    </div>
  );
});

Image.displayName = 'Image';

export default Image;
