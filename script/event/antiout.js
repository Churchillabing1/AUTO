module.exports.config = {
  name: "antiout",
  version: "1.0.0"
};

module.exports.handleEvent = async ({ event, api }) => {
  const leavingParticipant = event.logMessageData?.leftParticipantFbId;
  if (leavingParticipant === api.getCurrentUserID()) return;

  try {
    const userInfo = await api.getUserInfo(leavingParticipant);
    const { name } = userInfo;
    await api.addUserToGroup(leavingParticipant, event.threadID);
    api.sendMessage(`Active antiout mode, ${name} has been re-added to the group successfully!`, event.threadID);
  } catch (error) {
    api.sendMessage(`Unable to re-add member ${name} to the group!`, event.threadID);
  }
};
