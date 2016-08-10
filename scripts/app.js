/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function() {
    var LAZY_LOAD_THRESHOLD = 300;
    var $ = document.querySelector.bind(document);

    var stories = null;
    var storyStart = 0;
    var count = 100;
    var main = $('main');
    var inDetails = false;
    var storyLoadCount = 0;
    var localeData = {
        data: {
            intl: {
                locales: 'en-US'
            }
        }
    };

    var tmplStory = $('#tmpl-story').textContent;
    var tmplStoryDetails = $('#tmpl-story-details').textContent;
    var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

    if (typeof HandlebarsIntl !== 'undefined') {
        HandlebarsIntl.registerWith(Handlebars);
    } else {
        // Remove references to formatRelative, because Intl isn't supported.
        var intlRelative = /, {{ formatRelative time }}/;
        tmplStory = tmplStory.replace(intlRelative, '');
        tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
        tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
    }

    var storyTemplate = Handlebars.compile(tmplStory);
    var storyDetailsTemplate = Handlebars.compile(tmplStoryDetails);
    var storyDetailsCommentTemplate = Handlebars.compile(tmplStoryDetailsComment);

    /**
     * As every single story arrives in shove its
     * content in at that exact moment. Feels like something
     * that should really be handled more delicately, and
     * probably in a requestAnimationFrame callback.
     */
    function onStoryData(key, details) {
        var storyElement = document.querySelector('#s-' + key);

        if (!storyElement) {
            return;
        }

        var html = storyTemplate(details);

        details.time *= 1000;
        storyElement.innerHTML = html;
        storyElement.addEventListener('click', onStoryClick.bind(this, details));
        storyElement.classList.add('clickable');

        // Tick down. When zero we can batch in the next load.
        storyLoadCount--;

        // Colorize on complete.
        if (storyLoadCount === 0) {
            colorizeAndScaleStories();
        }
    }

    function onStoryClick(details) {
        var storyDetails = $('#story-details');

        // Wait a little time then show the story details.
        //setTimeout(showStory.bind(this, details.id), 60);
        requestAnimationFrame(showStory.bind(this));

        // Create and append the story. A visual change...
        // perhaps that should be in a requestAnimationFrame?
        // And maybe, since they're all the same, I don't
        // need to make a new element every single time? I mean,
        // it inflates the DOM and I can only see one at once.

        if (details.url) {
            details.urlobj = new URL(details.url);
        }

        var comment;
        var commentsElement;
        var storyHeader;
        var storyContent;

        var storyDetailsHtml = storyDetailsTemplate(details);
        var kids = details.kids;
        var commentHtml = storyDetailsCommentTemplate({
            by: '', text: 'Loading comment...'
        });

        storyDetails.innerHTML = storyDetailsHtml;
        commentsElement = storyDetails.querySelector('.js-comments');
        storyHeader = storyDetails.querySelector('.js-header');
        storyContent = storyDetails.querySelector('.js-content');

        var closeButton = storyDetails.querySelector('.js-close');
        closeButton.addEventListener('click', hideStory.bind(this));

        var headerHeight = storyHeader.getBoundingClientRect().height;
        storyContent.style.paddingTop = headerHeight + 'px';

        if (typeof kids === 'undefined') {
            return;
        }

        var handleGetStoryComment = function(commentDetails) {
            commentDetails.time *= 1000;

            var comment = commentsElement.querySelector('#sdc-' + commentDetails.id);
            comment.innerHTML = storyDetailsCommentTemplate(
                commentDetails,
                localeData
            );
        };

        for (var k = 0; k < kids.length; k++) {
            comment = document.createElement('aside');
            comment.setAttribute('id', 'sdc-' + kids[k]);
            comment.classList.add('story-details__comment');
            comment.innerHTML = commentHtml;
            commentsElement.appendChild(comment);

            // Update the comment with the live data.
            APP.Data.getStoryComment(kids[k], handleGetStoryComment);
        }
    }

    function showStory() {
        if (inDetails) {
            return;
        }

        inDetails = true;

        var storyDetails = $('#story-details');
        var left = null;

        if (!storyDetails) {
            return;
        }

        var storyDetailsPositionLeft = storyDetails.getBoundingClientRect().left;
        main.classList.add('details-active');
        storyDetails.style.opacity = 1;

        function animate() {

            // Set the left value if we don't have one already.
            if (left === null) {
                left = storyDetailsPositionLeft;
            }

            // Now figure out where it needs to go.
            left += (0 - storyDetailsPositionLeft) * 0.1;

            // Set up the next bit of the animation if there is more to do.
            if (Math.abs(left) > 0.5) {
                requestAnimationFrame(animate);
            } else {
                left = 0;
            }

            // And update the styles. Wait, is this a read-write cycle?
            // I hope I don't trigger a forced synchronous layout!
            storyDetails.style.left = left + 'px';
        }

        // We want slick, right, so let's do a setTimeout
        // every few milliseconds. That's going to keep
        // it all tight. Or maybe we're doing visual changes
        // and they should be in a requestAnimationFrame
        requestAnimationFrame(animate);
    }

    function hideStory() {
        if (!inDetails) {
            return;
        }

        var storyDetails = $('#story-details');
        var left = 0;
        var mainPositionWidth = main.getBoundingClientRect().width;
        var target = mainPositionWidth + 100;

        main.classList.remove('details-active');
        storyDetails.style.opacity = 0;

        function animate() {
            // Find out where it currently is.
            var storyDetailsPosition = storyDetails.getBoundingClientRect();

            // Now figure out where it needs to go.
            left += (target - storyDetailsPosition.left) * 0.1;

            // Set up the next bit of the animation if there is more to do.
            if (Math.abs(left - target) > 0.5) {
                requestAnimationFrame(animate);
            } else {
                left = target;
                inDetails = false;
            }

            // And update the styles. Wait, is this a read-write cycle?
            // I hope I don't trigger a forced synchronous layout!
            storyDetails.style.left = left + 'px';
        }

        // We want slick, right, so let's do a setTimeout
        // every few milliseconds. That's going to keep
        // it all tight. Or maybe we're doing visual changes
        // and they should be in a requestAnimationFrame
        requestAnimationFrame(animate);
    }

    /**
     * Does this really add anything? Can we do this kind
     * of work in a cheaper way?
     */
    function colorizeAndScaleStories() {
        var storyElements = document.querySelectorAll('.story');
        var documentTop = document.body.getBoundingClientRect().top;
        var documentBottom = document.body.getBoundingClientRect().bottom;
        var height = main.offsetHeight;
        var mainPosition = main.getBoundingClientRect();

        var storyHash = {};
        var story;
        var score;
        var title;

        for (var s = 0; s < storyElements.length; s++) {
            story = storyElements[s];
            storyHash[s] = {
                score: story.querySelector('.story__score'),
                title: story.querySelector('.story__title')
            };

            storyHash[s].scoreTop = storyHash[s].score.getBoundingClientRect().top;
            storyHash[s].scoreWidth = storyHash[s].score.getBoundingClientRect().width;

            if (storyHash[s].scoreTop < documentTop && storyHash[s].scoreTop > documentBottom) {
                break;
            }
        }

        // It does seem awfully broad to change all the
        // colors every time!
        for (s = 0; s < storyElements.length; s++) {
            if (storyHash[s].scoreTop < documentTop && storyHash[s].scoreTop > documentBottom) {
                break;
            }

            // Base the scale on the y position of the score.
            var scoreLocation = storyHash[s].scoreTop - documentTop;
            var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / height)));
            var opacity = Math.min(1, 1 - (0.5 * ((scoreLocation - 170) / height)));

            // Now figure out how wide it is and use that to saturate it.
            var saturation = (100 * ((storyHash[s].score.width - 38) / 2));

            storyHash[s].score.style.width = (scale * 40) + 'px';
            storyHash[s].score.style.height = (scale * 40) + 'px';
            storyHash[s].score.style.lineHeight = (scale * 40) + 'px';
            storyHash[s].score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';

            storyHash[s].title.style.opacity = opacity;
        }
    }

    main.addEventListener('touchstart', function(evt) {
        // I just wanted to test what happens if touchstart
        // gets canceled. Hope it doesn't block scrolling on mobiles...
        if (Math.random() > 0.97) {
            evt.preventDefault();
        }
    });

    main.addEventListener('scroll', function() {
        var mainScrollTop = main.scrollTop;
        var mainScrollHeight = main.scrollHeight;
        var mainOffsetHeight = main.offsetHeight;

        var header = $('header');
        var headerTitles = header.querySelector('.header__title-wrapper');
        var scrollTopCapped = Math.min(70, mainScrollTop);
        var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';

        colorizeAndScaleStories();
        header.style.height = (156 - scrollTopCapped) + 'px';
        headerTitles.style.webkitTransform = scaleString;
        headerTitles.style.transform = scaleString;

        // Add a shadow to the header.
        if (mainScrollTop > 70) {
            main.classList.add('raised');
        } else {
            main.classList.remove('raised');
        }

        // Check if we need to load the next batch of stories.
        var loadThreshold = (mainScrollHeight - mainOffsetHeight - LAZY_LOAD_THRESHOLD);
        if (mainScrollTop > loadThreshold) {
            loadStoryBatch();
        }
    });

    function loadStoryBatch() {
        if (storyLoadCount > 0) {
            return;
        }

        storyLoadCount = count;

        var end = storyStart + count;
        for (var i = storyStart; i < end; i++) {
            if (i >= stories.length) {
                return;
            }

            var key = String(stories[i]);
            var story = document.createElement('div');
            story.setAttribute('id', 's-' + key);
            story.classList.add('story');
            story.innerHTML = storyTemplate({
                title: '...',
                score: '-',
                by: '...',
                time: 0
            });
            main.appendChild(story);

            APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
        }

        storyStart += count;
    }

    // Bootstrap in the stories.
    APP.Data.getTopStories(function(data) {
        stories = data;
        loadStoryBatch();
        main.classList.remove('loading');
    });
})();
