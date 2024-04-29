/**
 * Check if the given value is a function.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a function, false otherwise.
 */
function isFunction(value) {
  return typeof value === "function";
}

/**
 * Check if the given value is a number and is an integer.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a number and is an integer, false otherwise.
 */
function isInteger(value) {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Check if the given value is null or undefined.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is null or undefined, false otherwise.
 */
function isNullOrUndefined(value) {
  return value === null || value === undefined;
}

/**
 * Check if the given value is an array.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is an array, false otherwise.
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * Check if the given value is a string.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a string, false otherwise.
 */
function isString(value) {
  return typeof value === "string";
}

/**
 * Format event reminders.
 * @param {object} reminder - The reminder object to format.
 * @returns {object} The formatted reminder object.
 */
function formatEventReminders(reminder) {
  const {
    id,
    lightweight_event_creator: { id: eventCreatorID },
    time,
    lightweight_event_type: {
      toLowerCase: eventTypeLower
    },
    location_name,
    location_coordinates,
    location_page,
    lightweight_event_status: {
      toLowerCase: eventStatusLower
    },
    note,
    repeat_mode: {
      toLowerCase: repeatModeLower
    },
    event_title,
    trigger_message,
    seconds_to_notify_before,
    allows_rsvp,
    related_event,
    event_reminder_members: {
      edges: memberEdges
    }
  } = reminder;

  return {
    reminderID: id,
    eventCreatorID,
    time,
    eventType: eventTypeLower(),
    locationName: location_name,
    locationCoordinates: location_coordinates,
    locationPage: location_page,
    eventStatus: eventStatusLower(),
    note,
    repeatMode: repeatModeLower(),
    eventTitle: event_title,
    triggerMessage: trigger_message,
    secondsToNotifyBefore: seconds_to_notify_before,
    allowsRsvp: allows_rsvp,
    relatedEvent: related_event,
    members: memberEdges.map(({ node: { id: memberID, guest_list_state: { toLowerCase: stateLower } } }) => ({
      memberID,
      state: stateLower()
    }))
  };
}

/**
 * Format thread GraphQL response.
 * @param {object} messageThread - The message thread object to format.
 * @returns {object} The formatted thread object.
 */
function formatThreadGraphQLResponse(messageThread) {
  const {
    thread_key: {
      thread_fbid: threadFbid,
      other_user_id: otherUserID
    },
    name,
    all_participants: {
      edges: participantEdges
    },
    unread_count,
    messages_count,
    updated_time_precise,
    mute_until,
    thread_type,
    is_viewer_subscribed: isViewerSubscribed,
    has_viewer_archived: hasViewerArchived,
    folder,
    cannot_reply_reason: cannotReplyReason,
    event_reminders,
    customization_info,
    thread_theme,
    thread_admins,
    group_approval_queue: {
      nodes: approvalQueueNodes
    },
    reactions_mute_mode: {
      toLowerCase: reactionsMuteModeLower
    },
    mentions_mute_mode: {
      toLowerCase: mentionsMuteModeLower
    },
    is_pin_protected: isPinProtected,
    related_page_thread,
    image: {
      uri: imageUri
    }
  } = messageThread;

  const threadID = threadFbid || otherUserID;
  const participantIDs = participantEdges.map(({ node: { messaging_actor: { id } } }) => id);
  const userInfo = participantEdges.map(({ node: { messaging_actor } }) => ({
    id: messaging_actor.id,
    name: messaging_actor.name,
    firstName: messaging_actor.short_name,
    vanity: messaging_actor.username,
    url: messaging_actor.url,
    thumbSrc: messaging_actor.big_image_src.uri,
    profileUrl: messaging_actor.big_image_src.uri,
    gender: messaging_actor.gender,
    type: messaging_actor.__typename,
    isFriend: messaging_actor.is_viewer_friend,
    isBirthday: !!messaging_actor.is_birthday //not sure?
  }));
  const lastMessage = messageThread.last_message;
  const snippetID = lastMessage && lastMessage.nodes && lastMessage.nodes[0] && lastMessage.nodes[0].message_sender && lastMessage.nodes[0].message_sender.messaging_actor ? lastMessage.nodes[0].message_sender.messaging_actor.id : null;
  const snippetText = lastMessage && lastMessage.nodes && lastMessage.nodes[0] ? lastMessage.nodes[0].snippet : null;
  const lastReadTimestamp = lastMessage && lastMessage.nodes && lastMessage.nodes[0] && lastMessage.nodes[0].timestamp_precise ? lastMessage.nodes[0].timestamp_precise : null;

  return {
    threadID,
    threadName: name,
    participantIDs,
    userInfo,
    unreadCount,
    messageCount: messages_count,
    timestamp: updated_time_precise,
    muteUntil,
    isGroup: thread_type === "GROUP",
    isSubscribed: isViewerSubscribed,
    isArchived: hasViewerArchived,
    folder,
    cannotReplyReason,
    eventReminders: event_reminders ? event_reminders.nodes.map(formatEventReminders) : null,
    emoji: customization_info ? customization_info.emoji : null,
    color: customization_info && customization_info.outgoing_bubble_color ? customization_info.outgoing_bubble_color.slice(2) : null,
    threadTheme,
    nicknames: customization_info && customization_info.participant_customizations ? customization_info.participant_customizations.reduce((res, val) => {
      if (val.nickname) res[val.participant_id] = val.nickname;
      return res;
    }, {}) : {},
    adminIDs: thread_admins,
    approvalMode: Boolean(approvalQueueNodes.length),
    approvalQueue: approvalQueueNodes.map(({ inviter: { id: inviterID }, requester: { id: requesterID }, request_timestamp, request_source }) => ({
      inviterID,
      requesterID,
      timestamp: request_timestamp,
      request_source
    })),
    reactionsMuteMode: reactionsMuteModeLower(),
    mentionsMuteMode: mentionsMuteModeLower(),
    isPinProtected,
    relatedPageThread,
    name: name,
    snippet: snippetText,
    snippetSender: snippetID,
    snippetAttachments: [],
    serverTimestamp: updated_time_precise,
    imageSrc: imageUri,
    isCanonicalUser: messageThread.is_canonical_neo_user,
    isCanonical: thread_type !== "GROUP",
    recipientsLoadable: true,
    hasEmailParticipant: false,
    readOnly: false,
    canReply: !cannotReplyReason,
    lastMessageTimestamp: lastMessage ? lastMessage.nodes[0].timestamp_precise : null,
    lastMessageType: "message",
    lastReadTimestamp,
    threadType: thread_type === "GROUP" ? 2 : 1,
    inviteLink: {
      enable: messageThread.joinable_mode ? messageThread.joinable_mode.mode === 1 : false,
      link: messageThread.joinable_mode ? messageThread.joinable_mode.link : null
    }
  };
}

/**
 * Format thread list.
 * @param {Array<object>} data - The thread list data to format.
 * @returns {Array<object>} The formatted thread list.
 */
function formatThreadList(data) {
  return data.map(formatThreadGraphQLResponse);
}

module.exports = function (defaultFuncs, api, ctx) {
  return function getThreadList(limit, timestamp, tags, callback) {
    if (!isFunction(callback)) {
      throw new Error("getThreadList: callback must be a function");
    }

    if (!isInteger(limit) || limit <= 0) {
      throw new Error("getThreadList: limit must be a positive integer");
    }

    if (!isNullOrUndefined(timestamp) && (!isInteger(timestamp) || !Number.isInteger(timestamp))) {
      throw new Error("getThreadList: timestamp must be an integer or null");
    }

    if (isString(tags)) {
      tags = [tags];
    }

    if (!isArray(tags)) {
      throw new Error("getThreadList: tags must be an array");
    }

    const form = {
      "av": ctx.globalOptions.pageID,
      "queries": JSON.stringify({
        "o0": {
          // This doc_id was valid on 2020-07-20
          "doc_id": "3336396659757871",
          "query_params": {
            "limit": limit + (timestamp ? 1 : 0),
            "before": timestamp,
            "tags": tags,
            "includeDeliveryReceipts": true,
            "includeSeqID": false
          }
        }
      }),
      "batch_name": "MessengerGraphQLThreadlistFetcher"
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (resData[resData.length - 1].error_results > 0) {
          throw resData[0].o0.errors;
        }

        if (resData[resData.length - 1].successful_results === 0) {
          throw new Error("getThreadList: there was no successful_results");
        }

        if (timestamp) {
          resData[0].o0.data.viewer.message_threads.nodes.shift();
        }

        callback(null, formatThreadList(resData[0].o0.data.viewer.message_threads.nodes));
      })
      .catch((err) => {
        console.error(err);
        return callback(err);
      });
  };
};
