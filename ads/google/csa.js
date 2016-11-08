/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {validateData} from '../../3p/3p';

// Global variables to store backfill options
let backfillAfsPageOptions = null;
let backfillAfsAdblockOptions = null;

/**
 * CSA callback function to resize the iframe and/or request backfill
 * @param {string} containerName
 * @param {boolean} adsLoaded
 */
function resizeIframe(containerName, adsLoaded) {

  if (adsLoaded) {
    try {

      // Get actual height and width of container
      const container = document.querySelector('#' + containerName);
      const height = container.offsetHeight;
      const ampHeight =
          window.context.initialIntersection.boundingClientRect.height;
      const touchTarget = 40;

      // If the height of the container is larger than the height of the
      // initially requested AMP tag, add the overflow element
      if (height > ampHeight) {

        // Create the overflow
        const overflow = document.createElement('div');
        overflow.id = 'overflow';
        overflow.style.position = 'absolute';
        overflow.style.height = touchTarget + 'px';
        overflow.style.width = '100%';

        // Create the line
        const line = document.createElement('div');
        line.style.background = 'rgba(0,0,0,.16)';
        line.style.height = '1px';
        overflow.appendChild(line);

        // SVG element (chevron) with styling
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="36px" ' +
            'height="36px" viewBox="0 0 48 48" fill="#757575"><path d="M14.83' +
            ' 16.42L24 25.59l9.17-9.17L36 19.25l-12 12-12-12z"/>' +
            '<path d="M0-.75h48v48H0z" fill="none"/> </svg>';

        const chevron = document.createElement('div');
        chevron.style.width = '36px';
        chevron.style.height = '36px';
        chevron.style.marginLeft = 'auto';
        chevron.style.marginRight = 'auto';
        chevron.style.display = 'block';
        chevron.innerHTML = svg;

        overflow.appendChild(chevron);

        // When the overflow element is clicked, resize the AMP iframe
        // to what we tried to resize before
        overflow.onclick = function() {
          window.context.requestResize('auto', height);
        };

        document.body.appendChild(overflow);

        // Resize the CSA iframe and container
        const newHeight = ampHeight - touchTarget;
        container.firstChild.style.height = newHeight + 'px';
        container.style.height = newHeight + 'px';
      }

      // Attempt to resize to actual CSA container height
      window.context.requestResize('auto', height);

      // Listen for success
      window.context.onResizeSuccess(function(requestedHeight) {

        const overflow = document.getElementById('overflow');

        // Hide overflow and resize container to full height
        if (overflow) {
          overflow.style.display = 'none';
          container.firstChild.style.height = requestedHeight + 'px';
          container.style.height = requestedHeight + 'px';
        }

      });

      window.context.onResizeDenied(function() {

        const overflow = document.getElementById('overflow');

        // Show overflow element and resize container to include overflow
        if (overflow) {
          overflow.style.display = '';
          const newHeight = ampHeight - touchTarget;
          container.firstChild.style.height = newHeight + 'px';
          container.style.height = newHeight + 'px';
        }
      });

    } catch (e) {
      // Callback error
    }
  } else {

    // If we need to backfill, make the call
    if (backfillAfsPageOptions != null &&
        backfillAfsAdblockOptions != null) {

      // We don't want to backfill again, so set global variables to null
      const tmpBackfillAfsPageOptions = backfillAfsPageOptions;
      const tmpBackfillAfsAdblockOptions = backfillAfsAdblockOptions;
      backfillAfsPageOptions = null;
      backfillAfsAdblockOptions = null;

      const _googCsa = window['_googCsa'];

      // Call AFS
      _googCsa('ads', tmpBackfillAfsPageOptions,
        tmpBackfillAfsAdblockOptions);

    } else {

      // Let AMP know we didn't return anything
      window.context.noContentAvailable();

    }
  }
}

/**
 * Resize the AMP iframe if the CSA container changes in size upon rotation.
 * This is needed for an iOS bug found in versions 10.0.1 and below that
 * doesn't properly reflow the iframe upon orientation change.
 */
window.addEventListener('orientationchange', function() {

  // Save the height of the container before the event listener triggers
  const oldHeight = document.getElementById('csacontainer').style.height;

  setTimeout(function() {

    // Force DOM reflow and repaint
    /*eslint-disable no-unused-vars*/
    const ignore = document.body.offsetHeight;
    /*eslint-enable no-unused-vars*/

    // Capture new height
    const container = document.getElementById('csacontainer');
    let newHeight = container.style.height;

    // In older versions of iOS, this height will be different because the
    // container height is resized.
    // In Chrome and iOS 10.0.2 the height is the same because
    // the container isn't resized.
    if (oldHeight != newHeight) {

      // style.height returns "60px" (for example), so turn this into an int
      newHeight = parseInt(newHeight, 10);

      // Resize the container to the correct height
      window.context.requestResize('auto', newHeight);

      // Also update the onclick function to resize to the right height.
      const overflow = document.getElementById('overflow');
      if (overflow) {
        overflow.onclick = function() {
          window.context.requestResize('auto', newHeight);
        };
      }
    }

  }, 250);

}, false);


/**
 * Request Custom Search Ads (Adsense for Search or AdSense for Shopping).
 * @param {!Window} global
 * @param {!Object} data
 */
export function csa(global, data) {

  // Get parent width in case we want to override
  const width = global.document.body.clientWidth;

  validateData(data, [], ['afshPageOptions',
                          'afshAdblockOptions',
                          'afsPageOptions',
                          'afsAdblockOptions',
                          'ampSlotIndex']);

  // Add the scripts
  const s = global.document.createElement('script');
  s.src = 'https://www.google.com/adsense/search/ads.js';
  global.document.body.appendChild(s);
  s.async = true;

  const f = global.document.createElement('script');
  f.text = '(function(g,o){g[o]=g[o]||' +
      'function(){(g[o][\'q\']=g[o][\'q\']||[]).' +
      'push(arguments)},g[o][\'t\']=1*new Date})(window,\'_googCsa\');';
  global.document.body.appendChild(f);

  // Add the ad container
  const d = global.document.createElement('div');
  d.id = 'csacontainer';
  global.document.body.appendChild(d);


  // Parse AFSh page options
  let afshPageOptions = {};
  if (data['afshPageOptions'] != null) {
    try {
      afshPageOptions = JSON.parse(data['afshPageOptions']);
      afshPageOptions['source'] = 'amp';
      afshPageOptions['referer'] = window.context.referrer;
    } catch (e) {}
  }

  // Parse AFSh adblock options
  let afshAdblockOptions = {};
  if (data['afshAdblockOptions'] != null) {
    try {
      afshAdblockOptions = JSON.parse(data['afshAdblockOptions']);

      // Set container to the container we just created
      afshAdblockOptions['container'] = 'csacontainer';

      // Set to our resize iframe callback
      afshAdblockOptions['adLoadedCallback'] = resizeIframe;

      // Set the width to the width of the screen if necessary
      if (afshAdblockOptions['width'] == 'auto') {
        afshAdblockOptions['width'] = width;
      }
    } catch (e) {}
  }

  // Parse AFS page options
  let afsPageOptions = {};
  if (data['afsPageOptions'] != null) {
    try {
      afsPageOptions = JSON.parse(data['afsPageOptions']);
      afsPageOptions['source'] = 'amp';
      afsPageOptions['referrer'] = window.context.referrer;
    } catch (e) {}
  }

  // Parse AFS adblock options
  let afsAdblockOptions = {};
  if (data['afsAdblockOptions'] != null) {
    try {
      afsAdblockOptions = JSON.parse(data['afsAdblockOptions']);

      // Set the container to the container we just created
      afsAdblockOptions['container'] = 'csacontainer';

      // Set to our resize iframe callback
      afsAdblockOptions['adLoadedCallback'] = resizeIframe;

    } catch (e) {}
  }

  // Make the call for CSA ads
  // Call the right product based on arguments passed
  if (data['afsPageOptions'] != null && data['afshPageOptions'] == null) {

    // AFS only
    global._googCsa('ads', afsPageOptions, afsAdblockOptions);

  } else if (data['afsPageOptions'] == null
    && data['afshPageOptions'] != null) {

    // AFSH only
    global._googCsa('plas', afshPageOptions, afshAdblockOptions);

  } else if (data['afsPageOptions'] != null
    && data['afshPageOptions'] != null) {

    // AFSh backfilled with AFS
    // Set global variables so the callback function knows the AFS params
    backfillAfsPageOptions = afsPageOptions;
    backfillAfsAdblockOptions = afsAdblockOptions;
    global._googCsa('plas', afshPageOptions, afshAdblockOptions);
  }

  // Ping viewability
  const unlisten = window.context.observeIntersection(function(changes) {
    changes.forEach(function(c) {
      if (c.intersectionRect.height > 0) {
        // TODO: ping that ad was viewed
        unlisten();
      }
    });
  });

}
