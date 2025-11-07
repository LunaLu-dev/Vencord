/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, {OptionType} from "@utils/types";
import { RelationshipStore } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";

// Remove this migration once enough time has passed
const settings = definePluginSettings({
    applyToIgnored: {
        description: "Completely hides all ignores users from view",
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "hideBlockedUsersInGuild",
    description: "Hides blocked users from guild member lists",
    authors: [Devs.lunalu],
    settings,

    // Use a function to get blocked user IDs dynamically
    get userIdsToHide() {
        if (settings.store.applyToIgnored) {
            return RelationshipStore.getIgnoredIDs().concat(RelationshipStore.getBlockedIDs());
        }
        return RelationshipStore.getBlockedIDs();
    },

    // Target the avatars in the DOM
    start() {
        // Create and inject a style element
        const style = document.createElement("style");

        // Generate CSS rules for each user ID
        const cssRules = this.userIdsToHide.map(userId => `
            /* Hide avatars with this user ID in the sidebar *//
            div.avatarStack__44b0c img[src*="${userId}"],
            img[src*="${userId}"] {
                display: none !important;
            }

            /* Hide the entire nameplate container when it contains this user ID */
            div.childContainer__91a9d:has(img[src*="${userId}"]),
            div.memberInner__5d473:has(img[src*="${userId}"]),
            div.content__91a9d:has(img[src*="${userId}"]) {
                display: none !important;
            }

            /* Hide autocomplete rows with this user ID */
                div.autocompleteRow__13533:has(img[src*="${userId}"]),
                div.autocompleteRowVertical__13533:has(img[src*="${userId}"]) {
                    display: none !important;
                }

            /* Hide Blocked Users */
                div.container__6b700:has(img[src*="${userId}"]) {
                display: none !important;
                }

            /* Hide user rows with blocked user ID */
                div.row__89036:has(img[src*="${userId}"]) {
                    display: none !important;
                }

            /* Hide DM channels with blocked user ID */
                li.dm__972a0:has(img[src*="${userId}"]),
                li.channel__972a0.dm__972a0:has(img[src*="${userId}"]) {
                    display: none !important;
                }

            /* Hide Friends with blocked user ID */
                div.peopleListItem_cc6179:has(img[src*="${userId}"]) {
                    display: none !important;
                }

        `).join("\n");

        style.textContent = cssRules;
        document.head.appendChild(style);

        // For elements that might be dynamically added later
        this.observer = new MutationObserver(this.checkAndHideUsers.bind(this));
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // Function to check and hide users that match our criteria
    checkAndHideUsers() {
        for (const userId of this.userIdsToHide) {
            // Find all images containing this user ID
            const avatarImages = document.querySelectorAll(`img[src*="${userId}"]`);

            avatarImages.forEach(img => {
                // Find the parent container (climbing up to find the nameplate container)
                let element = img;
                while (element && !element.classList.contains('childContainer__91a9d') &&
                !element.classList.contains('autocompleteRow__13533') &&
                !element.classList.contains('row__89036') &&
                !element.classList.contains('container__6b700') &&
                !element.classList.contains('dm__972a0') &&
                !element.classList.contains('channel__972a0') &&
                !element.classList.contains('peopleListItem_cc6179')) {
                    if (element.parentElement) {
                        element = element.parentElement;
                    } else {
                        break;
                    }
                }

                // Hide the container if found
                if (element) {
                    element.style.display = 'none';
                }
            });
        }
    },

    // Clean up when the plugin is disabled
    stop() {
        // Remove the style element
        const styleElement = document.querySelector('style[data-plugin="HideUsers"]');
        if (styleElement) styleElement.remove();

        // Disconnect the observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },

    // Function to add a user ID to the hide list
    addUserToHideList(userId:string) {
        if (!this.userIdsToHide.includes(userId)) {
            this.userIdsToHide.push(userId);
            this.stop();
            this.start();
        }
    },

    // Function to remove a user ID from the hide list
    removeUserFromHideList(userId: string) {
        const index = this.userIdsToHide.indexOf(userId);
        if (index !== -1) {
            this.userIdsToHide.splice(index, 1);
            this.stop();
            this.start();
        }
    }
});
